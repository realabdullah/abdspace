import { createProgram, createTarget, deleteTarget, type GL, type Palette, type RGB, type Target } from "~/lib/gl";
import { EDGE, type Atlas } from "./atlas";
import type { DrawList } from "./layout";

/**
 * Draws a DrawList: every glyph is one instanced quad sampling the distance field atlas, every rule and hit box
 * one instanced rect. Two draw calls for the whole page. Hit-testing is a third pass that renders only hit boxes,
 * each in its own colour, into a single scissored pixel under the pointer, then reads that pixel back.
 */

/** What the right of the seam shows: the distance field, the quads and line boxes, or the hit buffer. */
export type Mode = "field" | "quads" | "hits";
const MODES: Record<Mode, number> = { field: 1, quads: 2, hits: 3 };

export const MAX_HITS = 256;

const GLYPH_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec2 a_pos;
layout(location = 2) in vec2 a_size;
layout(location = 3) in vec4 a_uv;
layout(location = 4) in vec4 a_meta;   // tone, hit, field range in css px, baseline offset from the quad's top
uniform vec2 u_view;
uniform float u_scroll;
uniform vec2 u_atlasSize;
uniform sampler2D u_state;
uniform vec3 u_reveal;
uniform float u_time;
out vec2 v_uv;
out vec2 v_local;
out vec2 v_size;
flat out vec4 v_meta;
out float v_hover;
out float v_dim;
out float v_reveal;
void main() {
	int hit = int(a_meta.y + 0.5);
	vec4 state = texelFetch(u_state, ivec2(hit, 0), 0);
	float linked = step(0.5, a_meta.y);
	vec2 p = a_pos + a_corner * a_size;
	// A synthetic oblique: hovering a row shears its letters about their baseline, roman to italic and back.
	float baseline = a_pos.y + a_meta.w;
	p.x += (baseline - p.y) * 0.19 * state.r * linked;
	// Letters ink in outward from where you came in, nearer ones first.
	float d = distance(vec2(a_pos.x, a_pos.y - u_scroll), u_reveal.xy);
	v_reveal = clamp((u_time - u_reveal.z - d * 0.0009) / 0.85, 0.0, 1.0);
	v_uv = mix(a_uv.xy, a_uv.zw, a_corner) / u_atlasSize;
	v_local = a_corner;
	v_size = a_size;
	v_meta = a_meta;
	v_hover = state.r * linked;
	v_dim = state.g;
	vec2 screen = vec2(p.x, p.y - u_scroll);
	gl_Position = vec4(screen.x / u_view.x * 2.0 - 1.0, 1.0 - screen.y / u_view.y * 2.0, 0.0, 1.0);
}`;

const GLYPH_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
in vec2 v_local;
in vec2 v_size;
flat in vec4 v_meta;
in float v_hover;
in float v_dim;
in float v_reveal;
out vec4 color;
uniform sampler2D u_atlas;
uniform vec3 u_tones[3];
uniform float u_dpr;
uniform float u_weight;
uniform float u_soft;
uniform int u_machine;
uniform float u_seam;
uniform float u_viewHeight;
uniform vec2 u_pointer;
uniform float u_pressure;
void main() {
	vec2 p = vec2(gl_FragCoord.x, u_viewHeight * u_dpr - gl_FragCoord.y) / u_dpr;
	int mode = p.x > u_seam ? u_machine : 0;
	float field = texture(u_atlas, v_uv).r;
	float range = v_meta.z;
	float signedDistance = (field - ${EDGE.toFixed(2)}) * range;   // css px, positive inside the letter
	float reveal = v_reveal * v_reveal * (3.0 - 2.0 * v_reveal);
	// Nib pressure: near the pointer, display type swells, more where it's pressed hardest.
	float display = smoothstep(6.0, 12.0, range);
	float press = u_pressure * display * exp(-dot(p - u_pointer, p - u_pointer) / 30000.0) * range * 0.09;
	float d = signedDistance + u_weight + v_hover * 0.42 + press - (1.0 - reveal) * range * 0.8;
	float aa = 0.55 / u_dpr + u_soft;
	float alpha = smoothstep(-aa, aa, d) * mix(1.0, 0.3, v_dim);
	vec3 ink = u_tones[int(v_meta.x + 0.5)];

	if (mode == 1) {
		// The field itself as contour lines, spaced to the letter's size, fading toward the edge of its range.
		float spacing = max(range * 0.22, 1.6);
		float band = abs(fract(signedDistance / spacing + 0.5) - 0.5) * spacing;
		float reach = 1.0 - smoothstep(0.3, 1.0, abs(field - ${EDGE.toFixed(2)}) * 1.5);
		float contour = (1.0 - smoothstep(0.0, 1.0 / u_dpr, band)) * reach;
		float edge = 1.0 - smoothstep(0.0, 1.2 / u_dpr, abs(d));
		float a = max(max(contour * 0.6, edge), field * 0.05) * reveal;
		color = vec4(ink * a, a);
		return;
	}
	if (mode == 2) {
		vec2 edge = min(v_local, 1.0 - v_local) * v_size;
		float outline = 1.0 - smoothstep(0.0, 1.0 / u_dpr, min(edge.x, edge.y));
		float a = max(alpha, outline * 0.5 * reveal);
		color = vec4(mix(u_tones[2], ink, alpha / max(a, 1e-3)) * a, a);
		return;
	}
	if (mode == 3) alpha *= 0.2;
	color = vec4(ink * alpha, alpha);
}`;

const RECT_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec4 a_rect;
layout(location = 2) in vec4 a_meta;   // tone, hit, kind, unused
uniform vec2 u_view;
uniform float u_scroll;
uniform sampler2D u_state;
out vec2 v_local;
out vec2 v_size;
flat out vec4 v_meta;
flat out vec4 v_state;
const float GROW = 5.0;
void main() {
	v_state = texelFetch(u_state, ivec2(int(a_meta.y + 0.5), 0), 0);
	// Boxes are drawn a little larger, so a focus ring can sit outside the text it surrounds.
	float grow = a_meta.z > 0.5 && a_meta.z < 1.5 ? GROW : 0.0;
	vec2 size = a_rect.zw + grow * 2.0;
	vec2 p = a_rect.xy - grow + a_corner * size;
	v_local = a_corner * size - grow;
	v_size = a_rect.zw;
	v_meta = a_meta;
	vec2 screen = vec2(p.x, p.y - u_scroll);
	gl_Position = vec4(screen.x / u_view.x * 2.0 - 1.0, 1.0 - screen.y / u_view.y * 2.0, 0.0, 1.0);
}`;

const RECT_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_local;
in vec2 v_size;
flat in vec4 v_meta;
flat in vec4 v_state;
out vec4 color;
uniform vec3 u_tones[3];
uniform float u_dpr;
uniform int u_machine;
uniform float u_seam;
uniform float u_viewHeight;
uniform int u_pick;
uniform float u_progress;
uniform sampler2D u_atlas;
float roundedBox(vec2 p, vec2 size, float r) {
	vec2 d = abs(p - size * 0.5) - size * 0.5 + r;
	return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}
vec3 hue(float h) { return 0.5 + 0.5 * cos(6.2831853 * (h + vec3(0.0, 0.33, 0.67))); }
void main() {
	float px = gl_FragCoord.x / u_dpr;
	int mode = px > u_seam ? u_machine : 0;
	int kind = int(v_meta.z + 0.5);
	int hit = int(v_meta.y + 0.5);
	vec3 ink = u_tones[int(v_meta.x + 0.5)];
	if (u_pick == 1) {
		if (kind != 1 || roundedBox(v_local, v_size, 0.0) > 0.0) discard;
		color = vec4(float(hit % 256) / 255.0, float(hit / 256) / 255.0, 0.0, 1.0);
		return;
	}
	if (kind == 0 && v_meta.w > 0.5 && mode != 2) discard;
	if (kind == 0) {
		float a = mix(1.0, 0.3, v_state.g);
		color = vec4(ink * a, a);
		return;
	}
	if (kind == 2) {
		float a = step(v_local.x, v_size.x * u_progress);
		color = vec4(ink * a, a);
		return;
	}
	if (kind == 3) {
		// Debug: a line box outlined, with its baseline. Only on the machine side, in quads mode.
		if (mode != 2) discard;
		float edge = min(min(v_local.x, v_size.x - v_local.x), min(v_local.y, v_size.y - v_local.y));
		float a = (1.0 - smoothstep(0.0, 1.0 / u_dpr, edge)) * 0.35;
		color = vec4(ink * a, a);
		return;
	}
	if (kind == 4) {
		float field = texture(u_atlas, v_local / v_size).r;
		vec3 shade = mix(u_tones[2] * 0.2, u_tones[0], field);
		float edgeLine = 1.0 - smoothstep(0.0, 0.04, abs(field - ${EDGE.toFixed(2)}));
		color = vec4(mix(shade, u_tones[0], edgeLine * 0.6), 1.0);
		return;
	}
	// Hit boxes: invisible on the page, except as a focus ring; filled in when looking at the hit buffer.
	float box = roundedBox(v_local, v_size, 3.0);
	if (mode == 3) {
		// The hit buffer stores ids; here each id gets its own colour so you can see them.
		float a = (1.0 - smoothstep(-0.5, 0.5, box)) * 0.75;
		color = vec4(mix(hue(fract(float(hit) * 0.6180339)), u_tones[2], 0.55) * a, a);
		return;
	}
	float ring = (1.0 - smoothstep(0.0, 1.2 / u_dpr, abs(box - 3.0))) * v_state.b;
	color = vec4(u_tones[0] * ring, ring);
}`;

interface Instances {
	vao: WebGLVertexArrayObject;
	count: number;
}

export class Renderer {
	private glyphProgram;
	private rectProgram;
	private atlasTexture: WebGLTexture;
	private stateTexture: WebGLTexture;
	readonly state = new Uint8Array(MAX_HITS * 4);
	private corner: WebGLBuffer;
	private glyphs: Instances | null = null;
	private rects: Instances | null = null;
	private debugRects: Instances | null = null;
	private positionBuffer: WebGLBuffer | null = null;
	private pickTarget: Target | null = null;
	private keys: string[] = [];
	private target = new Float32Array(0);
	private current = new Float32Array(0);
	private settled = true;
	private buffers: WebGLBuffer[] = [];

	constructor(
		private gl: GL,
		private atlas: Atlas
	) {
		this.glyphProgram = createProgram(gl, GLYPH_VS, GLYPH_FS);
		this.rectProgram = createProgram(gl, RECT_VS, RECT_FS);

		this.corner = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.corner);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);

		this.atlasTexture = gl.createTexture()!;
		this.uploadAtlas();

		this.stateTexture = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, this.stateTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, MAX_HITS, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.state);
	}

	uploadAtlas() {
		const { gl, atlas } = this;
		gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, atlas.width, atlas.height, 0, gl.RED, gl.UNSIGNED_BYTE, atlas.data);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
	}

	private instanced(attributes: { location: number; size: number; data: Float32Array; dynamic?: boolean }[], count: number) {
		const { gl } = this;
		const vao = gl.createVertexArray()!;
		gl.bindVertexArray(vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.corner);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		const created: WebGLBuffer[] = [];
		for (const { location, size, data, dynamic } of attributes) {
			const buffer = gl.createBuffer()!;
			created.push(buffer);
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
			gl.enableVertexAttribArray(location);
			gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
			gl.vertexAttribDivisor(location, 1);
		}
		gl.bindVertexArray(null);
		this.buffers.push(...created);
		return { vao, count, buffers: created };
	}

	/** Replace what's drawn. Letters that exist in both layouts keep their place and glide to the new one. */
	setList(list: DrawList, glide: boolean) {
		const { gl } = this;
		for (const buffer of this.buffers) gl.deleteBuffer(buffer);
		this.buffers = [];

		const previous = new Map<string, [number, number]>();
		this.keys.forEach((key, i) => previous.set(key, [this.current[i * 2]!, this.current[i * 2 + 1]!]));

		const n = list.glyphs.length;
		const size = new Float32Array(n * 2);
		const uv = new Float32Array(n * 4);
		const meta = new Float32Array(n * 4);
		this.target = new Float32Array(n * 2);
		this.current = new Float32Array(n * 2);
		this.keys = list.glyphs.map((quad) => quad.key);
		list.glyphs.forEach((quad, i) => {
			this.target.set([quad.x, quad.y], i * 2);
			const from = glide ? previous.get(quad.key) : undefined;
			this.current.set(from ?? [quad.x, quad.y], i * 2);
			size.set([quad.w, quad.h], i * 2);
			uv.set([quad.glyph.x, quad.glyph.y, quad.glyph.x + quad.glyph.w, quad.glyph.y + quad.glyph.h], i * 4);
			meta.set([quad.tone, quad.hit, quad.glyph.face.radius * quad.scale, quad.baseline - quad.y], i * 4);
		});
		const glyphs = this.instanced(
			[
				{ location: 1, size: 2, data: this.current, dynamic: true },
				{ location: 2, size: 2, data: size },
				{ location: 3, size: 4, data: uv },
				{ location: 4, size: 4, data: meta },
			],
			n
		);
		this.positionBuffer = glyphs.buffers[0]!;
		this.glyphs = glyphs;
		this.settled = false;

		const kinds = { rule: 0, box: 1, progress: 2 } as const;
		const rectData = new Float32Array(list.rects.length * 4);
		const rectMeta = new Float32Array(list.rects.length * 4);
		list.rects.forEach((rect, i) => {
			rectData.set([rect.x, rect.y, rect.w, rect.h], i * 4);
			rectMeta.set([rect.tone, rect.hit, kinds[rect.kind], 0], i * 4);
		});
		this.rects = this.instanced(
			[
				{ location: 1, size: 4, data: rectData },
				{ location: 2, size: 4, data: rectMeta },
			],
			list.rects.length
		);

		// Debug overlay: every line box, and every baseline as a hairline.
		const debug = new Float32Array(list.lines.length * 8);
		const debugMeta = new Float32Array(list.lines.length * 8);
		list.lines.forEach((line, i) => {
			debug.set([line.x, line.y, line.w, line.h, line.x, line.baseline, line.w, 1], i * 8);
			debugMeta.set([2, 0, 3, 0, 1, 0, 0, 1], i * 8);
		});
		this.debugRects = this.instanced(
			[
				{ location: 1, size: 4, data: debug },
				{ location: 2, size: 4, data: debugMeta },
			],
			list.lines.length * 2
		);
	}

	get glyphCount() {
		return this.glyphs?.count ?? 0;
	}

	/** Ease every letter toward its place. Returns whether anything is still moving. */
	step(delta: number, snap: boolean) {
		if (this.settled || !this.positionBuffer) return false;
		const k = snap ? 1 : 1 - Math.exp(-delta * 9);
		let moving = false;
		for (let i = 0; i < this.current.length; i++) {
			const gap = this.target[i]! - this.current[i]!;
			if (Math.abs(gap) > 0.05) {
				this.current[i]! += gap * k;
				moving = true;
			} else this.current[i] = this.target[i]!;
		}
		const { gl } = this;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.current);
		this.settled = !moving;
		return moving;
	}

	private common(program: ReturnType<typeof createProgram>, frame: Frame) {
		const { gl } = this;
		const u = program.uniforms;
		gl.uniform2f(u.u_view!, frame.width, frame.height);
		gl.uniform1f(u.u_scroll!, frame.scroll);
		gl.uniform1i(u.u_state!, 1);
		if (u.u_dpr) gl.uniform1f(u.u_dpr, frame.dpr);
		if (u.u_tones) gl.uniform3fv(u.u_tones, [...frame.palette.fg, ...frame.palette.muted, ...frame.palette.faint]);
		if (u.u_machine) gl.uniform1i(u.u_machine, MODES[frame.mode]);
		if (u.u_seam) gl.uniform1f(u.u_seam, frame.seam);
		if (u.u_viewHeight) gl.uniform1f(u.u_viewHeight, frame.height);
		if (u.u_atlas) gl.uniform1i(u.u_atlas, 0);
	}

	private bindTextures() {
		const { gl } = this;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.stateTexture);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, MAX_HITS, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.state);
	}

	draw(frame: Frame) {
		const { gl } = this;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		const bg: RGB = frame.palette.bg;
		gl.clearColor(bg[0], bg[1], bg[2], 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		this.bindTextures();

		const rect = this.rectProgram;
		rect.use();
		this.common(rect, frame);
		gl.uniform1i(rect.uniforms.u_pick!, 0);
		gl.uniform1f(rect.uniforms.u_progress!, frame.progress);
		if (this.rects) {
			gl.bindVertexArray(this.rects.vao);
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.rects.count);
		}

		const glyph = this.glyphProgram;
		glyph.use();
		this.common(glyph, frame);
		gl.uniform2f(glyph.uniforms.u_atlasSize!, this.atlas.width, this.atlas.height);
		gl.uniform3f(glyph.uniforms.u_reveal!, frame.reveal.x, frame.reveal.y, frame.reveal.start);
		gl.uniform1f(glyph.uniforms.u_time!, frame.time);
		gl.uniform1f(glyph.uniforms.u_weight!, frame.weight);
		gl.uniform1f(glyph.uniforms.u_soft!, frame.softness);
		gl.uniform2f(glyph.uniforms.u_pointer!, frame.pointer.x, frame.pointer.y);
		gl.uniform1f(glyph.uniforms.u_pressure!, frame.pressure);
		if (this.glyphs) {
			gl.bindVertexArray(this.glyphs.vao);
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.glyphs.count);
		}

		if (this.debugRects) {
			rect.use();
			gl.bindVertexArray(this.debugRects.vao);
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.debugRects.count);
		}
		gl.disable(gl.BLEND);
		gl.bindVertexArray(null);
	}

	/** The atlas itself, drawn as a panel. Uses the rect program with the atlas texture. */
	drawAtlas(frame: Frame, box: { x: number; y: number; w: number; h: number }) {
		const { gl } = this;
		const rect = this.rectProgram;
		rect.use();
		this.bindTextures();
		this.common(rect, { ...frame, scroll: 0 });
		gl.uniform1i(rect.uniforms.u_pick!, 0);
		const atlasQuad = this.instanced(
			[
				{ location: 1, size: 4, data: new Float32Array([box.x, box.y, box.w, box.h]) },
				{ location: 2, size: 4, data: new Float32Array([0, 0, 4, 0]) },
			],
			1
		);
		gl.bindVertexArray(atlasQuad.vao);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1);
		gl.bindVertexArray(null);
		for (const buffer of atlasQuad.buffers) {
			gl.deleteBuffer(buffer);
			this.buffers.splice(this.buffers.indexOf(buffer), 1);
		}
		gl.deleteVertexArray(atlasQuad.vao);
	}

	/** Which hit box is under a point: drawn into one pixel of an offscreen target and read back. */
	pick(frame: Frame, x: number, y: number) {
		const { gl } = this;
		if (!this.rects) return 0;
		const width = gl.drawingBufferWidth;
		const height = gl.drawingBufferHeight;
		if (!this.pickTarget || this.pickTarget.width !== width || this.pickTarget.height !== height) {
			if (this.pickTarget) deleteTarget(gl, this.pickTarget);
			this.pickTarget = createTarget(gl, width, height, { internalFormat: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE, filter: gl.NEAREST });
		}
		const px = Math.floor(x * frame.dpr);
		const py = Math.floor(height - y * frame.dpr - 1);
		if (px < 0 || py < 0 || px >= width || py >= height) return 0;

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickTarget.fbo);
		gl.viewport(0, 0, width, height);
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(px, py, 1, 1);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		const rect = this.rectProgram;
		rect.use();
		this.bindTextures();
		this.common(rect, frame);
		gl.uniform1i(rect.uniforms.u_pick!, 1);
		gl.bindVertexArray(this.rects.vao);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.rects.count);
		const pixel = new Uint8Array(4);
		gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
		gl.disable(gl.SCISSOR_TEST);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindVertexArray(null);
		return pixel[0]! + pixel[1]! * 256;
	}

	dispose() {
		const { gl } = this;
		for (const buffer of this.buffers) gl.deleteBuffer(buffer);
		if (this.pickTarget) deleteTarget(gl, this.pickTarget);
		gl.getExtension("WEBGL_lose_context")?.loseContext();
	}
}

export interface Frame {
	width: number;
	height: number;
	dpr: number;
	scroll: number;
	time: number;
	palette: Palette;
	mode: Mode;
	/** Left of this x the page is drawn finished; right of it, the machinery. */
	seam: number;
	pointer: { x: number; y: number };
	pressure: number;
	weight: number;
	softness: number;
	progress: number;
	reveal: { x: number; y: number; start: number };
}
