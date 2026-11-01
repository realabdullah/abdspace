<script setup lang="ts">
import type { RoomContent } from "~/composables/useRoomContent";
import { createScopeVoice } from "~/lib/audio";
import { FULLSCREEN_VS, bindTarget, bindTexture, clamp, createDoubleTarget, createFullscreenTriangle, createGL, createProgram, fitCanvas, prefersReducedMotion, readPalette, startLoop, watchPalette, type DoubleTarget, type Palette } from "~/lib/gl";

/*
 * 波: a wave, a signal. The room is an XY oscilloscope. Every project is a Lissajous figure whose frequency
 * ratio is picked from its name, and that ratio is a musical interval: turn sound on and the left channel is x,
 * the right is y, so what you hear is exactly what draws the shape. Writing decays like a harmonograph.
 * My name is traced from its own letterforms. Move the cursor over the screen and it bends the beam like a magnet.
 */

const props = defineProps<{ content: RoomContent }>();
const { playing, lateNight } = useNowPlaying();
const { enabled: soundOn } = useRoomSound();
const takeArrival = useRoomArrival();

const N = 1400;

// Ratios ordered roughly by how consonant they sound, each with its name.
const INTERVALS: { a: number; b: number; name: string }[] = [
	{ a: 3, b: 2, name: "a perfect fifth" },
	{ a: 4, b: 3, name: "a perfect fourth" },
	{ a: 5, b: 4, name: "a major third" },
	{ a: 6, b: 5, name: "a minor third" },
	{ a: 5, b: 3, name: "a major sixth" },
	{ a: 8, b: 5, name: "a minor sixth" },
	{ a: 2, b: 1, name: "an octave" },
	{ a: 7, b: 4, name: "a harmonic seventh" },
	{ a: 9, b: 8, name: "a major second" },
	{ a: 7, b: 5, name: "a septimal tritone" },
	{ a: 7, b: 6, name: "a septimal minor third" },
	{ a: 5, b: 2, name: "a major tenth" },
	{ a: 3, b: 1, name: "a twelfth" },
	{ a: 15, b: 8, name: "a major seventh" },
	{ a: 9, b: 5, name: "a minor seventh" },
	{ a: 11, b: 8, name: "an undecimal fourth" },
];

const hash = (text: string) => {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
	return h >>> 0;
};

type Shape = { type: "text"; lines: string[]; font: string } | { type: "lissajous"; a: number; b: number; phase: number; decay: number; name: string };

interface Scene {
	key: string;
	label: string;
	shape: Shape;
}

const intervalFor = (text: string) => INTERVALS[hash(text) % INTERVALS.length]!;

const scenes = computed<Scene[]>(() => [
	{ key: "intro", label: `${profile.name.first} ${profile.name.last}`, shape: { type: "text", lines: [profile.name.first, profile.name.last], font: "italic 250 120px Newsreader, Georgia, serif" } },
	...props.content.projects.map((project) => {
		const interval = intervalFor(project.title);
		return { key: `p:${project.link}`, label: project.title, shape: { type: "lissajous" as const, ...interval, phase: ((hash(project.link) % 628) / 100) * 0.5, decay: 0 } };
	}),
	...props.content.writings.map((post) => {
		const interval = intervalFor(post.slug);
		return { key: `w:${post.slug}`, label: post.title, shape: { type: "lissajous" as const, ...interval, phase: 0.3, decay: 2.2 } };
	}),
	{ key: "contact", label: "contact", shape: { type: "lissajous", a: 1, b: 1, phase: Math.PI / 2, decay: 0, name: "a unison" } },
	{ key: "ganbaru", label: profile.ganbaru.word, shape: { type: "text", lines: [profile.ganbaru.word], font: "800 150px 'Shippori Mincho B1', serif" } },
]);

const activeKey = ref("intro");
const hoverKey = ref<string | null>(null);
const shownKey = computed(() => hoverKey.value ?? activeKey.value);
const shownScene = computed(() => scenes.value.find((scene) => scene.key === shownKey.value) ?? scenes.value[0]!);

/* ─── Shapes as point lists ─── */

/** Letterforms to a single beam path: find the outline pixels, then walk them nearest-first. */
const traceText = (lines: string[], font: string): Float32Array => {
	const canvas = document.createElement("canvas");
	canvas.width = 900;
	canvas.height = 180 * lines.length + 40;
	const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
	ctx.font = font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#000";
	lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, 20 + 180 * (i + 0.5)));
	const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && data[(y * width + x) * 4 + 3]! > 127;

	const edge: [number, number][] = [];
	for (let y = 0; y < height; y += 2) {
		for (let x = 0; x < width; x += 2) {
			if (inside(x, y) && (!inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2))) edge.push([x, y]);
		}
	}
	if (!edge.length) return circle(1);

	const used = new Uint8Array(edge.length);
	const order: [number, number][] = [];
	const jumps: boolean[] = [];
	let at = 0;
	for (let n = 0; n < edge.length; n++) {
		used[at] = 1;
		order.push(edge[at]!);
		let best = -1;
		let bestDistance = Infinity;
		const [cx, cy] = edge[at]!;
		for (let i = 0; i < edge.length; i++) {
			if (used[i]) continue;
			const d = (edge[i]![0] - cx) ** 2 + (edge[i]![1] - cy) ** 2;
			if (d < bestDistance) {
				bestDistance = d;
				best = i;
			}
		}
		if (best < 0) break;
		jumps.push(bestDistance > 40);
		at = best;
	}

	// Resample to N points by length along the outline. Jumps between strokes cost nothing, so the beam leaps them.
	const lengths = [0];
	for (let i = 1; i < order.length; i++) {
		const step = jumps[i - 1] ? 0 : Math.hypot(order[i]![0] - order[i - 1]![0], order[i]![1] - order[i - 1]![1]);
		lengths.push(lengths[i - 1]! + step);
	}
	const total = lengths.at(-1)! || 1;
	const out = new Float32Array(N * 2);
	const scale = 2 / Math.max(width, height * 1.2);
	let j = 0;
	for (let k = 0; k < N; k++) {
		const target = (k / (N - 1)) * total;
		while (j < lengths.length - 2 && lengths[j + 1]! < target) j++;
		const [x, y] = order[j]!;
		out[k * 2] = (x - width / 2) * scale;
		out[k * 2 + 1] = -(y - height / 2) * scale;
	}
	return out;
};

const circle = (r: number) => {
	const out = new Float32Array(N * 2);
	for (let k = 0; k < N; k++) {
		const t = (k / N) * Math.PI * 2;
		out[k * 2] = Math.cos(t) * r;
		out[k * 2 + 1] = Math.sin(t) * r;
	}
	return out;
};

const lissajous = ({ a, b, phase, decay }: Extract<Shape, { type: "lissajous" }>, drift: number, out = new Float32Array(N * 2)) => {
	const turns = decay > 0 ? 6 : 1;
	for (let k = 0; k < N; k++) {
		const u = k / (N - 1);
		const t = u * Math.PI * 2 * turns;
		const envelope = decay > 0 ? Math.exp(-u * decay) : 1;
		out[k * 2] = Math.sin(a * t + phase + drift) * 0.86 * envelope;
		out[k * 2 + 1] = Math.sin(b * t) * 0.86 * envelope;
	}
	return out;
};

/* ─── Sound: the same shape, as a stereo loop ─── */

let voice: ReturnType<typeof createScopeVoice> | null = null;
const textCache = new Map<string, Float32Array>();

const voiceFor = (scene: Scene) => {
	const rate = voice!.sampleRate;
	if (scene.shape.type === "lissajous") {
		const { a, b, phase } = scene.shape;
		// One loop holds exactly a and b whole cycles, so the ratio, and the interval, are exact. The lower voice sits at 110 Hz.
		const length = Math.round((rate * Math.min(a, b)) / 110);
		const left = new Float32Array(length);
		const right = new Float32Array(length);
		for (let n = 0; n < length; n++) {
			const t = (n / length) * Math.PI * 2;
			left[n] = Math.sin(a * t + phase) * 0.8;
			right[n] = Math.sin(b * t) * 0.8;
		}
		return { left, right, level: 1 };
	}
	// Letterforms loop at about 55 Hz: a low buzz with the outline in its overtones.
	const points = textCache.get(scene.key) ?? circle(1);
	const length = Math.round(rate / 55);
	const left = new Float32Array(length);
	const right = new Float32Array(length);
	for (let n = 0; n < length; n++) {
		const k = Math.floor((n / length) * N);
		left[n] = points[k * 2]! * 0.7;
		right[n] = points[k * 2 + 1]! * 0.7;
	}
	return { left, right, level: 0.35 };
};

const readout = computed(() => {
	const shape = shownScene.value.shape;
	if (shape.type === "text") return "x · y · traced from the letterforms";
	const low = 110;
	const high = (110 * Math.max(shape.a, shape.b)) / Math.min(shape.a, shape.b);
	return `${shape.a}:${shape.b} · ${shape.name} · ${Math.round(high)} Hz over ${low} Hz${shape.decay ? " · decaying" : ""}`;
});

/* ─── Beam rendering ─── */

const BEAM_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec2 a_a;
layout(location = 2) in vec2 a_b;
uniform vec2 u_view;
uniform vec2 u_centre;
uniform float u_scale;
uniform float u_width;
out vec2 v_pos;
flat out vec2 v_a;
flat out vec2 v_b;
void main() {
	vec2 a = u_centre + vec2(a_a.x, -a_a.y) * u_scale;
	vec2 b = u_centre + vec2(a_b.x, -a_b.y) * u_scale;
	vec2 d = b - a;
	float len = length(d);
	vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
	vec2 n = vec2(-dir.y, dir.x);
	vec2 p = mix(a, b, a_corner.x * 0.5 + 0.5) + dir * a_corner.x * u_width + n * a_corner.y * u_width;
	v_pos = p;
	v_a = a;
	v_b = b;
	gl_Position = vec4(p.x / u_view.x * 2.0 - 1.0, 1.0 - p.y / u_view.y * 2.0, 0.0, 1.0);
}`;

// A beam spends less time on a long segment than a short one, so it's dimmer there: the leaps between strokes all but vanish.
const BEAM_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_pos;
flat in vec2 v_a;
flat in vec2 v_b;
out vec4 color;
uniform float u_energy;
void main() {
	vec2 pa = v_pos - v_a, ba = v_b - v_a;
	float len = length(ba);
	float d = length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0));
	float dwell = u_energy / (len + 0.8);
	float beam = exp(-d * d / 1.4) + exp(-d / 5.0) * 0.08;
	color = vec4(vec3(beam * dwell), 1.0);
}`;

const FADE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 color;
uniform sampler2D u_prev;
uniform float u_keep;
void main() { color = texture(u_prev, v_uv) * u_keep; }`;

const SCREEN_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 color;
uniform sampler2D u_glow;
uniform vec2 u_view;
uniform float u_dpr;
uniform vec4 u_rect;   // scope: x, y, w, h
uniform vec3 u_bg;
uniform vec3 u_fg;
uniform vec3 u_faint;
uniform float u_time;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float box(vec2 p, vec2 c, vec2 h, float r) { vec2 d = abs(p - c) - h + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
void main() {
	vec2 p = vec2(gl_FragCoord.x, u_view.y * u_dpr - gl_FragCoord.y) / u_dpr;
	vec3 col = u_bg;
	vec2 c = u_rect.xy + u_rect.zw * 0.5;
	vec2 h = u_rect.zw * 0.5;
	float inside = step(box(p, c, h, 18.0), 0.0);

	// Graticule: ten by eight, dotted, with a finer tick along the centre lines.
	vec2 g = (p - u_rect.xy) / u_rect.zw * vec2(10.0, 8.0);
	vec2 cell = abs(fract(g + 0.5) - 0.5) * u_rect.zw / vec2(10.0, 8.0);
	float dots = step(fract((p.x + p.y) * 0.25), 0.5);
	float grid = (step(cell.x, 0.5) + step(cell.y, 0.5)) * dots;
	vec2 mid = abs(p - c);
	float ticks = step(mid.x, 0.5) * step(fract(g.y * 5.0), 0.12) + step(mid.y, 0.5) * step(fract(g.x * 5.0), 0.12);
	col = mix(col, u_faint, clamp(grid * 0.5 + ticks, 0.0, 1.0) * inside * 0.6);
	col = mix(col, u_faint, 1.0 - clamp(abs(box(p, c, h, 18.0)) * u_dpr - 0.3, 0.0, 1.0));

	vec3 glow = texture(u_glow, v_uv).rgb;
	float energy = 1.0 - exp(-glow.r * 1.6);
	col = mix(col, u_fg, energy * inside);
	col += (hash(gl_FragCoord.xy + fract(u_time) * 13.0) - 0.5) * 0.016;
	// Only the scope and its bezel are painted; the page shows through everywhere else.
	float alpha = clamp(inside + 1.0 - clamp(abs(box(p, c, h, 18.0)) * u_dpr - 0.3, 0.0, 1.0), 0.0, 1.0);
	color = vec4(col * alpha, alpha);
}`;

const canvas = ref<HTMLCanvasElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
const rect = reactive({ x: 0, y: 0, w: 0, h: 0 });
const glReady = ref(false);

const measureRect = () => {
	const width = innerWidth;
	const height = innerHeight;
	const gutter = clamp(width * 0.05, 16, 56);
	if (width >= 900) {
		const w = Math.min(width * 0.5, height * 1.15) - gutter;
		Object.assign(rect, { x: gutter, y: 84, w, h: Math.min(height - 190, w * 0.8) });
	} else {
		const h = height * 0.38;
		Object.assign(rect, { x: gutter, y: 64, w: width - gutter * 2, h });
	}
};

// The scene follows the item nearest the middle of the list's view, unless you're pointing at one.
const syncActive = () => {
	const items = listEl.value?.querySelectorAll<HTMLElement>("[data-scene]");
	if (!items?.length) return;
	const line = innerWidth >= 900 ? innerHeight * 0.5 : rect.y + rect.h + (innerHeight - rect.y - rect.h) * 0.35;
	let best = items[0]!;
	let bestDistance = Infinity;
	for (const item of items) {
		const box = item.getBoundingClientRect();
		const distance = Math.abs(box.top + box.height / 2 - line);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = item;
		}
	}
	activeKey.value = scrollY < 40 ? "intro" : (best.dataset.scene ?? "intro");
};

onMounted(async () => {
	const reduce = prefersReducedMotion();
	const arrival = takeArrival();
	measureRect();
	await document.fonts.ready;
	for (const scene of scenes.value) if (scene.shape.type === "text") textCache.set(scene.key, traceText(scene.shape.lines, scene.shape.font));

	// Every point starts where you clicked and springs into the first shape.
	const unit = Math.min(rect.w, rect.h) * 0.44;
	const startX = (arrival.x - (rect.x + rect.w / 2)) / unit;
	const startY = -(arrival.y - (rect.y + rect.h / 2)) / unit;
	const points = new Float32Array(N * 2);
	const velocity = new Float32Array(N * 2);
	for (let k = 0; k < N; k++) {
		points[k * 2] = startX;
		points[k * 2 + 1] = startY;
	}
	const shown = new Float32Array(N * 2);
	let target = textCache.get("intro") ?? circle(0.8);
	const figure = new Float32Array(N * 2);
	let drift = 0;
	const magnet = { x: 0, y: 0, power: 0 };
	let kick: { x: number; y: number } | null = null;

	let palette: Palette = readPalette();
	const stopPalette = watchPalette((next) => (palette = next));

	const gl = canvas.value ? createGL(canvas.value) : null;
	let render: ((time: number, keep: number) => void) | null = null;
	let disposeGL = () => {};

	if (gl && gl.getExtension("EXT_color_buffer_float")) {
		try {
			gl.getExtension("EXT_float_blend");
			const beam = createProgram(gl, BEAM_VS, BEAM_FS);
			const fade = createProgram(gl, FULLSCREEN_VS, FADE_FS);
			const screen = createProgram(gl, FULLSCREEN_VS, SCREEN_FS);
			const triangle = createFullscreenTriangle(gl);

			const vao = gl.createVertexArray()!;
			gl.bindVertexArray(vao);
			gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
			const pointBuffer = gl.createBuffer()!;
			gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, shown.byteLength, gl.DYNAMIC_DRAW);
			// Each segment reads two neighbouring points out of the same buffer: a at i, b at i + 1.
			gl.enableVertexAttribArray(1);
			gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8, 0);
			gl.vertexAttribDivisor(1, 1);
			gl.enableVertexAttribArray(2);
			gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 8, 8);
			gl.vertexAttribDivisor(2, 1);
			gl.bindVertexArray(null);

			let glow: DoubleTarget | null = null;
			const ensureGlow = () => {
				if (fitCanvas(canvas.value!) || !glow) glow = createDoubleTarget(gl, gl.drawingBufferWidth, gl.drawingBufferHeight);
				return glow;
			};

			render = (time, keep) => {
				const target = ensureGlow();
				const dpr = gl.drawingBufferWidth / innerWidth;

				fade.use();
				bindTarget(gl, target.write);
				gl.uniform1i(fade.uniforms.u_prev!, bindTexture(gl, 0, target.read.texture));
				gl.uniform1f(fade.uniforms.u_keep!, keep);
				triangle();

				beam.use();
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.ONE, gl.ONE);
				gl.uniform2f(beam.uniforms.u_view!, innerWidth, innerHeight);
				gl.uniform2f(beam.uniforms.u_centre!, rect.x + rect.w / 2, rect.y + rect.h / 2);
				gl.uniform1f(beam.uniforms.u_scale!, Math.min(rect.w, rect.h) * 0.44);
				gl.uniform1f(beam.uniforms.u_width!, 6);
				gl.uniform1f(beam.uniforms.u_energy!, 0.5 * dpr);
				gl.bindVertexArray(vao);
				gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
				gl.bufferSubData(gl.ARRAY_BUFFER, 0, shown);
				gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, N - 1);
				gl.disable(gl.BLEND);
				target.swap();

				screen.use();
				bindTarget(gl, null);
				gl.uniform1i(screen.uniforms.u_glow!, bindTexture(gl, 0, target.read.texture));
				gl.uniform2f(screen.uniforms.u_view!, innerWidth, innerHeight);
				gl.uniform1f(screen.uniforms.u_dpr!, dpr);
				gl.uniform4f(screen.uniforms.u_rect!, rect.x, rect.y, rect.w, rect.h);
				gl.uniform3fv(screen.uniforms.u_bg!, palette.bg);
				gl.uniform3fv(screen.uniforms.u_fg!, palette.fg);
				gl.uniform3fv(screen.uniforms.u_faint!, palette.faint);
				gl.uniform1f(screen.uniforms.u_time!, time);
				triangle();
			};
			disposeGL = () => gl.getExtension("WEBGL_lose_context")?.loseContext();
			glReady.value = true;
		} catch (error) {
			console.error(error);
		}
	}

	const onPointerMove = (event: PointerEvent) => {
		const unitNow = Math.min(rect.w, rect.h) * 0.44;
		magnet.x = (event.clientX - (rect.x + rect.w / 2)) / unitNow;
		magnet.y = -(event.clientY - (rect.y + rect.h / 2)) / unitNow;
		const insideScope = event.clientX > rect.x && event.clientX < rect.x + rect.w && event.clientY > rect.y && event.clientY < rect.y + rect.h;
		magnet.power = insideScope ? 1 : 0;
	};
	const onPointerDown = (event: PointerEvent) => {
		if (event.clientX > rect.x && event.clientX < rect.x + rect.w && event.clientY > rect.y && event.clientY < rect.y + rect.h) kick = { x: magnet.x, y: magnet.y };
	};
	addEventListener("pointermove", onPointerMove, { passive: true });
	addEventListener("pointerdown", onPointerDown, { passive: true });

	let lastKey = "";
	let magnetPower = 0;
	const stop = startLoop((time, delta) => {
		const scene = shownScene.value;
		drift += delta * 0.35;
		if (scene.shape.type === "lissajous") target = lissajous(scene.shape, reduce ? 0 : drift, figure);
		else target = textCache.get(scene.key) ?? target;

		if (scene.key !== lastKey) {
			lastKey = scene.key;
			if (voice && soundOn.value) {
				const { left, right, level } = voiceFor(scene);
				voice.play(left, right, level);
			}
		}

		if (kick) {
			for (let k = 0; k < N; k++) {
				const dx = points[k * 2]! - kick.x;
				const dy = points[k * 2 + 1]! - kick.y;
				const d = Math.hypot(dx, dy) + 0.05;
				velocity[k * 2]! += (dx / d) * (1.6 / (d * 6 + 1));
				velocity[k * 2 + 1]! += (dy / d) * (1.6 / (d * 6 + 1));
			}
			kick = null;
		}

		magnetPower += ((reduce ? 0 : magnet.power) - magnetPower) * Math.min(1, delta * 6);
		const tremor = playing.value && !reduce ? 0.004 : 0;
		const friction = Math.exp(-delta * 9);
		for (let k = 0; k < N; k++) {
			const i = k * 2;
			// Each point has its own stiffness, so a morph ripples along the beam instead of moving as one block.
			const stiffness = reduce ? 1e4 : 40 + 70 * ((k * 7919) % N) / N;
			velocity[i] = (velocity[i]! + (target[i]! - points[i]!) * stiffness * delta) * friction;
			velocity[i + 1] = (velocity[i + 1]! + (target[i + 1]! - points[i + 1]!) * stiffness * delta) * friction;
			points[i]! += velocity[i]! * delta;
			points[i + 1]! += velocity[i + 1]! * delta;
			let x = points[i]!;
			let y = points[i + 1]!;
			if (magnetPower > 0.01) {
				// A magnet held to the glass: push the beam away, falling off with the square of distance.
				const dx = x - magnet.x;
				const dy = y - magnet.y;
				const d2 = dx * dx + dy * dy + 0.02;
				const push = (magnetPower * 0.012) / d2;
				x += dx * push;
				y += dy * push;
			}
			shown[i] = x + (tremor ? (Math.random() - 0.5) * tremor : 0);
			shown[i + 1] = y + (tremor ? (Math.random() - 0.5) * tremor : 0);
		}

		// Late at night the phosphor lingers.
		render?.(time, lateNight.value ? 0.9 : 0.8);
	});

	const onScroll = () => syncActive();
	const onResize = () => {
		measureRect();
		syncActive();
	};
	addEventListener("scroll", onScroll, { passive: true });
	addEventListener("resize", onResize);

	const stopSound = watch(
		soundOn,
		(on) => {
			if (on) {
				voice ??= createScopeVoice();
				const { left, right, level } = voiceFor(shownScene.value);
				voice.play(left, right, level);
			} else voice?.stop();
		},
		{ immediate: true }
	);

	onUnmounted(() => {
		stop();
		stopPalette();
		stopSound();
		voice?.stop();
		removeEventListener("pointermove", onPointerMove);
		removeEventListener("pointerdown", onPointerDown);
		removeEventListener("scroll", onScroll);
		removeEventListener("resize", onResize);
		disposeGL();
	});
});

const sections = computed(() => [
	{ id: "projects", label: "side projects", items: props.content.projects.map((project) => ({ key: `p:${project.link}`, title: project.title, detail: project.about, meta: `${formatMonthYear(project.date)} · ${hostOf(project.link)}`, href: project.link, external: true })) },
	{
		id: "writing",
		label: "writing",
		items: props.content.writings.map((post) => ({ key: `w:${post.slug}`, title: post.title, detail: post.description, meta: `${formatMonthYear(post.createdAt)} · ${post.readTime} min`, href: `/writings/${post.slug}`, external: false })),
	},
]);

const ratioOf = (key: string) => {
	const shape = scenes.value.find((scene) => scene.key === key)?.shape;
	return shape?.type === "lissajous" ? `${shape.a}:${shape.b}` : "";
};
</script>

<template>
	<div class="nami">
		<canvas ref="canvas" class="nami__canvas" aria-hidden="true" />

		<div class="scope" :style="{ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` }" aria-hidden="true">
			<span class="scope__label mono"><span lang="ja" class="scope__seed" data-room-seed>波</span> CH1 x · CH2 y</span>
			<span v-if="!glReady" class="scope__fallback mono muted">this room draws with WebGL2</span>
		</div>
		<div class="readout mono" :style="{ left: `${rect.x}px`, top: `${rect.y + rect.h + 14}px`, width: `${rect.w}px` }">
			<p class="readout__scene">{{ shownScene.label }}</p>
			<p class="muted">{{ readout }}</p>
			<RoomSound />
		</div>

		<div ref="listEl" class="list">
			<header class="block" data-scene="intro">
				<p class="mono muted">{{ profile.kicker }}</p>
				<h1 class="list__name">
					{{ profile.name.first }} <em>{{ profile.name.last }}</em>
				</h1>
				<p class="list__lede">{{ profile.lede }} {{ profile.aside }}</p>
				<NowLine class="list__now" />
			</header>

			<section v-for="section in sections" :key="section.id" class="block">
				<h2 class="mono muted list__label">{{ section.label }} · {{ section.items.length }}</h2>
				<ul>
					<li v-for="item in section.items" :key="item.key" :data-scene="item.key" class="item" :class="{ 'is-on': shownKey === item.key }">
						<NuxtLink
							:to="item.href"
							:external="item.external"
							:target="item.external ? '_blank' : undefined"
							:rel="item.external ? 'noopener noreferrer' : undefined"
							class="item__link"
							@mouseenter="hoverKey = item.key"
							@mouseleave="hoverKey = null"
							@focus="hoverKey = item.key"
							@blur="hoverKey = null"
						>
							<span class="item__title">{{ item.title }}</span>
							<span class="item__ratio mono">{{ ratioOf(item.key) }}</span>
							<span class="item__detail">{{ item.detail }}</span>
							<span class="item__meta mono">{{ item.meta }}<template v-if="item.external"> ↗</template></span>
						</NuxtLink>
					</li>
				</ul>
			</section>

			<section class="block" data-scene="contact">
				<h2 class="mono muted list__label">contact · 1:1</h2>
				<p class="list__contact">
					Write to me at <a :href="`mailto:${profile.email}`">{{ profile.email }}</a
					>, or find me on
					<template v-for="(link, i) in profile.links" :key="link.href"
						><a :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.label }}</a
						>{{ i === profile.links.length - 2 ? " and " : i < profile.links.length - 1 ? ", " : "." }}</template
					>
				</p>
			</section>

			<footer class="block block--last" data-scene="ganbaru">
				<p lang="ja" class="list__glyphs">{{ profile.ganbaru.word }}</p>
				<p class="mono muted"><i>{{ profile.ganbaru.reading }}</i>: {{ profile.ganbaru.gloss }}</p>
			</footer>
		</div>
	</div>
</template>

<style scoped>
.nami {
	position: relative;
}
.nami__canvas {
	position: fixed;
	z-index: 2;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
}
.scope {
	position: fixed;
	z-index: 3;
	pointer-events: none;
}
.scope__label {
	position: absolute;
	top: -1.6rem;
	left: 0;
	display: flex;
	align-items: baseline;
	gap: 0.6rem;
	color: var(--muted);
}
.scope__seed {
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-size: 1.1rem;
	color: var(--fg);
}
.scope__fallback {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	border: 1px solid var(--rule);
	border-radius: 18px;
}
.readout {
	position: fixed;
	display: grid;
	gap: 0.2rem;
	z-index: 3;
}
.readout__scene {
	color: var(--fg);
}

.list {
	position: relative;
	z-index: 0;
	margin-left: max(52vw, calc(min(50vw, 115vh) + 2rem));
	padding: 7rem var(--gutter) 40vh 0;
	max-width: 40rem;
}
.block {
	padding-block: 3rem;
}
.block--last {
	padding-bottom: 0;
}
.list__name {
	margin-top: 1rem;
	font-weight: 300;
	font-size: clamp(2.5rem, 5vw, 4.5rem);
	line-height: 0.92;
	letter-spacing: -0.035em;
}
.list__name em {
	display: block;
	font-weight: 250;
}
.list__lede {
	margin-top: 1.5rem;
	font-size: 1.125rem;
	line-height: 1.5;
	text-wrap: pretty;
}
.list__now {
	margin-top: 1.25rem;
	font-size: 1rem;
}
.list__label {
	font-weight: 400;
	margin-bottom: 1rem;
}
.item__link {
	display: grid;
	grid-template-columns: 1fr auto;
	gap: 0.2rem 1rem;
	padding-block: 0.9rem;
	border-top: 1px solid var(--rule);
	transition: opacity 300ms ease;
}
.list:has(.item.is-on) .item:not(.is-on) .item__link {
	opacity: 0.45;
}
.item__title {
	font-size: 1.375rem;
	line-height: 1.2;
	letter-spacing: -0.01em;
}
.item.is-on .item__title {
	font-style: italic;
}
.item__ratio {
	color: var(--muted);
	align-self: baseline;
}
.item__detail {
	grid-column: 1 / -1;
	color: var(--muted);
	font-size: 1rem;
	line-height: 1.45;
}
.item__meta {
	grid-column: 1 / -1;
	color: var(--muted);
}
.list__contact {
	font-weight: 300;
	font-size: clamp(1.5rem, 2.6vw, 2.1rem);
	line-height: 1.25;
	text-wrap: pretty;
}
.list__contact a {
	font-style: italic;
	background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 100% 1px;
	overflow-wrap: anywhere;
}
.list__glyphs {
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-weight: 800;
	font-size: 3.5rem;
	line-height: 1;
	margin-bottom: 0.75rem;
}

@media (max-width: 899px) {
	.list {
		margin-left: 0;
		padding: calc(38svh + 11rem) var(--gutter) 30vh;
	}
	.readout {
		background: var(--bg);
		padding-bottom: 0.5rem;
	}
	.nami::before {
		content: "";
		position: fixed;
		inset: 0 0 auto;
		height: calc(38svh + 10rem);
		background: linear-gradient(to bottom, var(--bg) 92%, transparent);
		z-index: 1;
		pointer-events: none;
	}
}
</style>
