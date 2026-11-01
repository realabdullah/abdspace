<script setup lang="ts">
import type { RoomContent, RoomProject, RoomWriting } from "~/composables/useRoomContent";
import { pluck } from "~/lib/audio";
import { clamp, createGL, createProgram, damp, prefersReducedMotion, readPalette, startLoop, watchPalette, fitCanvas, type Palette } from "~/lib/gl";
import { add, createBox, cross, lookAt, multiply, normalize, perspective, project, rayBox, scale, sub, type Vec3 } from "~/lib/space";

/*
 * 継手: joinery, wood joined without nails. This room is the underside of the paper one.
 * The editorial page turns over and shows how it's built: every component is a piece of timber,
 * cut to the shape of the real component tree and held in by tenons. Pull a piece out along its
 * joint and what it holds is there to read. Push it back and it seats with a knock.
 */

const props = defineProps<{ content: RoomContent }>();
const { enabled: soundOn } = useRoomSound();

type Content =
	| { type: "app" }
	| { type: "links" }
	| { type: "hero" }
	| { type: "intro" }
	| { type: "now" }
	| { type: "ganbaru" }
	| { type: "projects" }
	| { type: "project"; project: RoomProject }
	| { type: "writings" }
	| { type: "writing"; writing: RoomWriting }
	| { type: "contact" }
	| { type: "footer" }
	| { type: "glyph"; glyph: string; reading: string; meaning: string };

interface Piece {
	id: string;
	label: string;
	file: string;
	parent?: string;
	size: Vec3;
	rest: Vec3;
	axis: Vec3;
	reach: number;
	tenons: { size: Vec3; offset: Vec3 }[];
	content: Content;
}

const UP: Vec3 = [0, 1, 0];
const BASE_TOP = 0.2;

/** Two tenons for a wide piece, one for a narrow one, cut into the face that meets its parent. */
const tenonsFor = (size: Vec3, axis: Vec3): Piece["tenons"] => {
	if (axis[0] !== 0) return [{ size: [size[0] * 0.9, 0.14, size[2] * 0.42], offset: [0, -(size[1] / 2 + 0.07), 0] }];
	const depth = 0.42;
	if (size[0] < 2) return [{ size: [size[0] * 0.45, depth, size[2] * 0.45], offset: [0, -(size[1] / 2 + depth / 2), 0] }];
	return [-0.28, 0.28].map((x) => ({ size: [size[0] * 0.18, depth, size[2] * 0.5] as Vec3, offset: [size[0] * x, -(size[1] / 2 + depth / 2), 0] as Vec3 }));
};

const pieces = computed<Piece[]>(() => {
	const list: Omit<Piece, "tenons">[] = [];
	const on = (parentTop: number, height: number) => parentTop + height / 2;

	list.push({ id: "app", label: "<App>", file: "app.vue", size: [13, 0.4, 18.4], rest: [0, 0, 0], axis: UP, reach: 0, content: { type: "app" } });
	list.push({
		id: "header",
		label: "<SiteHeader>",
		file: "SiteHeader.vue",
		parent: "app",
		size: [12, 0.35, 1],
		rest: [0, on(BASE_TOP, 0.35), -7.9],
		axis: UP,
		reach: 2.4,
		content: { type: "links" },
	});

	const heroTop = BASE_TOP + 0.6;
	list.push({
		id: "hero",
		label: "<section.hero>",
		file: "pages/index.vue",
		parent: "app",
		size: [12, 0.6, 4.4],
		rest: [0, on(BASE_TOP, 0.6), -4.6],
		axis: UP,
		reach: 3.4,
		content: { type: "hero" },
	});
	list.push({
		id: "intro",
		label: "<h1> + intro",
		file: "pages/index.vue",
		parent: "hero",
		size: [6.4, 0.45, 2.1],
		rest: [-2.4, on(heroTop, 0.45), -5.4],
		axis: UP,
		reach: 2.4,
		content: { type: "intro" },
	});
	list.push({ id: "now", label: "<NowLine>", file: "NowLine.vue", parent: "hero", size: [6.4, 0.3, 1], rest: [-2.4, on(heroTop, 0.3), -3.4], axis: UP, reach: 2, content: { type: "now" } });
	list.push({
		id: "ganbaru",
		label: "<GanbaruColumn>",
		file: "GanbaruColumn.vue",
		parent: "hero",
		size: [1.3, 2.6, 3.6],
		rest: [4.6, on(heroTop, 2.6), -4.6],
		axis: UP,
		reach: 2.6,
		content: { type: "ganbaru" },
	});

	const projectsTop = BASE_TOP + 0.5;
	list.push({
		id: "projects",
		label: "<ProjectList>",
		file: "ProjectList.vue",
		parent: "app",
		size: [12, 0.5, 5.2],
		rest: [0, on(BASE_TOP, 0.5), 0.4],
		axis: UP,
		reach: 3.6,
		content: { type: "projects" },
	});
	const featured = props.content.projects.filter((project) => project.featured).slice(0, 6);
	const projectPitch = 4.6 / Math.max(1, featured.length);
	featured.forEach((project, i) => {
		list.push({
			id: `project-${i}`,
			label: `<a.row> ${project.title}`,
			file: `content/projects/${project.title.toLowerCase().replace(/\s+/g, "-")}.yml`,
			parent: "projects",
			size: [11, 0.18, projectPitch * 0.8],
			rest: [0, on(projectsTop, 0.18), 0.4 - 2.3 + projectPitch * (i + 0.5)],
			axis: [1, 0, 0],
			reach: 7.5,
			content: { type: "project", project },
		});
	});

	const writingTop = BASE_TOP + 0.5;
	list.push({
		id: "writings",
		label: "<section#writing>",
		file: "pages/index.vue",
		parent: "app",
		size: [12, 0.5, 3],
		rest: [0, on(BASE_TOP, 0.5), 4.8],
		axis: UP,
		reach: 3,
		content: { type: "writings" },
	});
	const latest = props.content.writings.slice(0, 4);
	const writingPitch = 2.6 / Math.max(1, latest.length);
	latest.forEach((writing, i) => {
		list.push({
			id: `writing-${i}`,
			label: `<a.row> ${writing.title}`,
			file: `writings/${writing.slug}.md`,
			parent: "writings",
			size: [11, 0.18, writingPitch * 0.78],
			rest: [0, on(writingTop, 0.18), 4.8 - 1.3 + writingPitch * (i + 0.5)],
			axis: [-1, 0, 0],
			reach: 7.5,
			content: { type: "writing", writing },
		});
	});

	list.push({
		id: "contact",
		label: "<section#contact>",
		file: "pages/index.vue",
		parent: "app",
		size: [12, 0.4, 1.3],
		rest: [0, on(BASE_TOP, 0.4), 7.1],
		axis: UP,
		reach: 2.4,
		content: { type: "contact" },
	});
	list.push({
		id: "footer",
		label: "<SiteFooter>",
		file: "SiteFooter.vue",
		parent: "app",
		size: [12, 0.35, 1],
		rest: [0, on(BASE_TOP, 0.35), 8.45],
		axis: UP,
		reach: 2,
		content: { type: "footer" },
	});
	profile.ganbaru.parts.forEach((part, i) => {
		list.push({
			id: `glyph-${i}`,
			label: part.glyph,
			file: "SiteFooter.vue",
			parent: "footer",
			size: [0.7, 0.7, 0.7],
			rest: [(i - 1) * 1.1, on(BASE_TOP + 0.35, 0.7), 8.45],
			axis: UP,
			reach: 1.6,
			content: { type: "glyph", ...part },
		});
	});

	return list.map((piece) => ({ ...piece, tenons: piece.id === "app" ? [] : tenonsFor(piece.size, piece.axis) }));
});

const byId = computed(() => new Map(pieces.value.map((piece) => [piece.id, piece])));
const childrenOf = (id: string) => pieces.value.filter((piece) => piece.parent === id);

/** Where data comes from. Drawn outside the assembly with a thread to the piece that reads it. */
const sources = [
	{ id: "spotify", label: "/api/playing · Spotify", to: "now", at: [-10, 3.6, -3.4] as Vec3 },
	{ id: "yaml", label: "content/projects/*.yml", to: "projects", at: [-10, 2.4, 0.4] as Vec3 },
	{ id: "blog", label: "abdspace-blog · writing", to: "writings", at: [-10, 2.4, 4.8] as Vec3 },
];

/* ─── State ─── */

const motion = new Map<string, { pull: number; vel: number; target: number }>();
const openId = ref<string | null>(null);
const hoverId = ref<string | null>(null);
const exploded = ref(false);
const glReady = ref(false);

const stateOf = (id: string) => {
	let state = motion.get(id);
	if (!state) motion.set(id, (state = { pull: 0, vel: 0, target: 0 }));
	return state;
};

const ancestorsOf = (id: string) => {
	const chain: string[] = [];
	let current = byId.value.get(id)?.parent;
	while (current) {
		chain.push(current);
		current = byId.value.get(current)?.parent;
	}
	return chain;
};

/** A piece's centre right now: its rest position, moved by its own pull and every parent's. */
const centreOf = (piece: Piece): Vec3 => {
	let at = piece.rest;
	let current: Piece | undefined = piece;
	while (current) {
		at = add(at, scale(current.axis, stateOf(current.id).pull));
		current = current.parent ? byId.value.get(current.parent) : undefined;
	}
	return at;
};

const setOpen = (id: string | null) => {
	const keep = new Set(id ? [id, ...ancestorsOf(id)] : []);
	for (const piece of pieces.value) {
		if (piece.reach === 0) continue;
		const state = stateOf(piece.id);
		if (piece.id === id) state.target = piece.reach;
		else if (!keep.has(piece.id) && !exploded.value) state.target = 0;
		else if (!keep.has(piece.id)) state.target = piece.reach * 0.45;
	}
	openId.value = id;
};

const toggle = (id: string) => setOpen(openId.value === id ? null : id);

const setExploded = (value: boolean) => {
	exploded.value = value;
	for (const piece of pieces.value) {
		if (piece.reach === 0) continue;
		stateOf(piece.id).target = value ? piece.reach * 0.45 : piece.id === openId.value ? piece.reach : 0;
	}
	if (!value && openId.value) setOpen(openId.value);
};

/* ─── Camera ─── */

const camera = { yaw: 0, pitch: 1.5, distance: 30, aspect: 1.6, width: 1280, height: 800, eye: [0, 30, 0] as Vec3, viewProj: new Float32Array(16) };
const target: Vec3 = [0, 0.6, 0.4];
let wantYaw = -0.62;
let wantPitch = 0.66;
let zoom = 1;

const rayAt = (x: number, y: number) => {
	const forward = normalize(sub(target, camera.eye));
	const right = normalize(cross(forward, UP));
	const up = cross(right, forward);
	const tanHalf = Math.tan(FOV / 2);
	const nx = (x / camera.width) * 2 - 1;
	const ny = 1 - (y / camera.height) * 2;
	const dir = normalize(add(forward, add(scale(right, nx * tanHalf * camera.aspect), scale(up, ny * tanHalf))));
	return { origin: camera.eye, dir };
};
const FOV = (30 * Math.PI) / 180;

const pick = (x: number, y: number) => {
	const { origin, dir } = rayAt(x, y);
	let best: Piece | null = null;
	let distance = Infinity;
	for (const piece of pieces.value) {
		if (piece.reach === 0) continue;
		const t = rayBox(origin, dir, centreOf(piece), piece.size);
		if (t < distance) {
			distance = t;
			best = piece;
		}
	}
	return best;
};

/* ─── Pointer ─── */

let drag: { id: string; x: number; y: number; start: number; dir: { x: number; y: number }; perUnit: number; moved: boolean } | null = null;
let orbit: { x: number; y: number; yaw: number; pitch: number } | null = null;
const cursor = ref("grab");

const onPointerDown = (event: PointerEvent) => {
	const el = event.currentTarget as HTMLElement;
	const rect = el.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const y = event.clientY - rect.top;
	const piece = pick(x, y);
	el.setPointerCapture(event.pointerId);
	if (piece) {
		// Work out which way the joint runs on screen, so the drag follows the grain of the piece.
		const centre = centreOf(piece);
		const a = project(camera.viewProj, centre, camera.width, camera.height);
		const b = project(camera.viewProj, add(centre, piece.axis), camera.width, camera.height);
		let dx = b.x - a.x;
		let dy = b.y - a.y;
		let perUnit = Math.hypot(dx, dy);
		if (perUnit < 8) {
			dx = 0;
			dy = -1;
			perUnit = 40;
		}
		drag = { id: piece.id, x, y, start: stateOf(piece.id).pull, dir: { x: dx / Math.hypot(dx, dy), y: dy / Math.hypot(dx, dy) }, perUnit, moved: false };
		cursor.value = "grabbing";
	} else {
		orbit = { x, y, yaw: wantYaw, pitch: wantPitch };
		cursor.value = "grabbing";
	}
};

const onPointerMove = (event: PointerEvent) => {
	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
	const x = event.clientX - rect.left;
	const y = event.clientY - rect.top;
	if (drag) {
		const along = (x - drag.x) * drag.dir.x + (y - drag.y) * drag.dir.y;
		if (Math.abs(along) > 4) drag.moved = true;
		const piece = byId.value.get(drag.id)!;
		const state = stateOf(drag.id);
		state.pull = clamp(drag.start + along / drag.perUnit, 0, piece.reach);
		state.target = state.pull;
		state.vel = 0;
		return;
	}
	if (orbit) {
		wantYaw = orbit.yaw - (x - orbit.x) * 0.006;
		wantPitch = clamp(orbit.pitch + (y - orbit.y) * 0.005, 0.12, 1.5);
		return;
	}
	const piece = pick(x, y);
	hoverId.value = piece?.id ?? null;
	cursor.value = piece ? "pointer" : "grab";
};

const onPointerUp = () => {
	if (drag) {
		const piece = byId.value.get(drag.id)!;
		const state = stateOf(drag.id);
		if (!drag.moved) toggle(piece.id);
		else if (state.pull > piece.reach * 0.4) setOpen(piece.id);
		else {
			state.target = 0;
			if (openId.value === piece.id) openId.value = null;
		}
	}
	drag = null;
	orbit = null;
	cursor.value = hoverId.value ? "pointer" : "grab";
};

const onWheel = (event: WheelEvent) => {
	event.preventDefault();
	zoom = clamp(zoom * Math.exp(event.deltaY * 0.001), 0.55, 1.6);
};

/* ─── Shaders ─── */

const PIECE_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;
uniform mat4 u_viewProj;
uniform vec3 u_offset;
uniform vec3 u_scale;
out vec3 v_normal;
out vec2 v_uv;
out vec3 v_world;
void main() {
	v_world = a_pos * u_scale + u_offset;
	v_normal = a_normal;
	v_uv = a_uv;
	gl_Position = u_viewProj * vec4(v_world, 1.0);
}`;

// Paper in, ink out: tone from a single light, hatching where it falls into shade, and every edge drawn.
const PIECE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 v_normal;
in vec2 v_uv;
in vec3 v_world;
out vec4 color;
uniform vec3 u_paper;
uniform vec3 u_ink;
uniform float u_emphasis;
uniform float u_hole;
uniform float u_grain;
void main() {
	vec3 n = normalize(v_normal);
	float light = dot(n, normalize(vec3(-0.35, 1.0, 0.45))) * 0.5 + 0.5;
	vec3 col = mix(u_paper, u_ink, (1.0 - light) * 0.16 + u_hole * 0.5);

	// End grain and long grain: fine lines along the piece, wavering slightly.
	float along = dot(v_world, vec3(0.0, 0.0, 1.0)) * (1.0 - abs(n.z)) + v_world.x * abs(n.z);
	float rings = abs(fract((along + sin(v_world.x * 0.7 + v_world.z * 0.4) * 0.12) * 6.0) - 0.5);
	col = mix(col, u_ink, (1.0 - smoothstep(0.0, fwidth(along) * 6.0 * 1.4, rings)) * 0.05 * u_grain);

	// Hatching in shade.
	float hatchCoord = dot(v_world, vec3(1.0, 1.0, -1.0)) * 7.0;
	float hatch = abs(fract(hatchCoord) - 0.5) / fwidth(hatchCoord);
	col = mix(col, u_ink, (1.0 - clamp(hatch - 0.5, 0.0, 1.0)) * smoothstep(0.62, 0.35, light) * 0.22);

	vec2 w = fwidth(v_uv);
	vec2 edge = min(v_uv, 1.0 - v_uv) / max(w, vec2(1e-5));
	float ink = 1.0 - clamp(min(edge.x, edge.y) - (0.4 + u_emphasis * 0.7), 0.0, 1.0);
	col = mix(col, u_ink, ink * mix(0.75, 1.0, u_emphasis));
	color = vec4(col, 1.0);
}`;

const LINE_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec3 a_pos;
layout(location = 1) in float a_along;
uniform mat4 u_viewProj;
out float v_along;
void main() {
	v_along = a_along;
	gl_Position = u_viewProj * vec4(a_pos, 1.0);
}`;

// Data moving: dashes travel from the source toward the piece that reads it.
const LINE_FS = /* glsl */ `#version 300 es
precision highp float;
in float v_along;
out vec4 color;
uniform vec3 u_ink;
uniform vec3 u_paper;
uniform float u_time;
uniform float u_live;
void main() {
	float dash = step(0.45, fract(v_along * 2.2 - u_time * mix(0.25, 0.9, u_live)));
	color = vec4(mix(u_paper, u_ink, mix(0.35, 0.85, dash)), 1.0);
}`;

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const labelEls = new Map<string, HTMLElement>();
const sourceEls = new Map<string, HTMLElement>();
const card = ref<HTMLElement | null>(null);
const setEl = (map: Map<string, HTMLElement>, id: string) => (el: unknown) => {
	if (el instanceof HTMLElement) map.set(id, el);
	else map.delete(id);
};

const { playing } = useNowPlaying();
const openPiece = computed(() => (openId.value ? byId.value.get(openId.value) : undefined));

onMounted(() => {
	const reduce = prefersReducedMotion();
	let palette: Palette = readPalette();
	const stopPalette = watchPalette((next) => (palette = next));
	if (reduce) {
		camera.yaw = wantYaw;
		camera.pitch = wantPitch;
	}

	const gl = canvas.value ? createGL(canvas.value, { antialias: true, alpha: false }) : null;
	let render: ((time: number) => void) | null = null;

	if (gl) {
		try {
			const pieceProgram = createProgram(gl, PIECE_VS, PIECE_FS);
			const lineProgram = createProgram(gl, LINE_VS, LINE_FS);
			const box = createBox(gl);

			const lineVao = gl.createVertexArray()!;
			const lineBuffer = gl.createBuffer()!;
			gl.bindVertexArray(lineVao);
			gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
			gl.enableVertexAttribArray(1);
			gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);
			gl.bindVertexArray(null);
			const SEGMENTS = 28;
			const lineData = new Float32Array(sources.length * SEGMENTS * 2 * 4);

			const drawBox = (centre: Vec3, size: Vec3, emphasis: number, hole = 0, grain = 1) => {
				gl.uniform3fv(pieceProgram.uniforms.u_offset!, centre);
				gl.uniform3fv(pieceProgram.uniforms.u_scale!, size);
				gl.uniform1f(pieceProgram.uniforms.u_emphasis!, emphasis);
				gl.uniform1f(pieceProgram.uniforms.u_hole!, hole);
				gl.uniform1f(pieceProgram.uniforms.u_grain!, grain);
				box();
			};

			render = (time) => {
				fitCanvas(canvas.value!);
				gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
				gl.clearColor(palette.bg[0], palette.bg[1], palette.bg[2], 1);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				gl.enable(gl.DEPTH_TEST);
				gl.enable(gl.CULL_FACE);

				pieceProgram.use();
				gl.uniformMatrix4fv(pieceProgram.uniforms.u_viewProj!, false, camera.viewProj);
				gl.uniform3fv(pieceProgram.uniforms.u_paper!, palette.bg);
				gl.uniform3fv(pieceProgram.uniforms.u_ink!, palette.fg);

				for (const piece of pieces.value) {
					const centre = centreOf(piece);
					const emphasis = piece.id === hoverId.value || piece.id === openId.value ? 1 : 0;
					drawBox(centre, piece.size, emphasis);
					for (const tenon of piece.tenons) drawBox(add(centre, tenon.offset), tenon.size, emphasis * 0.5, 0, 0.4);
					// The mortise each child sits in: a dark cut on this piece's face, only seen once the child is out.
					for (const child of childrenOf(piece.id)) {
						const offset = sub(child.rest, piece.rest);
						for (const tenon of child.tenons) {
							const slot = add(add(centre, offset), tenon.offset);
							const top = centre[1] + piece.size[1] / 2 + 0.004;
							drawBox([slot[0], top, slot[2]], [tenon.size[0], 0.006, tenon.size[2]], 0, 1, 0);
						}
					}
				}
				for (const source of sources) drawBox(source.at, [0.9, 0.5, 0.5], 0, 0.15, 0);

				let o = 0;
				for (const source of sources) {
					const piece = byId.value.get(source.to)!;
					const centre = centreOf(piece);
					const end: Vec3 = [centre[0] - piece.size[0] / 2, centre[1] + piece.size[1] / 2, centre[2]];
					const start: Vec3 = [source.at[0] + 0.45, source.at[1], source.at[2]];
					const control: Vec3 = [(start[0] + end[0]) / 2, Math.max(start[1], end[1]) + 1.6, (start[2] + end[2]) / 2];
					const point = (t: number): Vec3 => add(add(scale(start, (1 - t) * (1 - t)), scale(control, 2 * t * (1 - t))), scale(end, t * t));
					for (let s = 0; s < SEGMENTS; s++) {
						for (const t of [s / SEGMENTS, (s + 1) / SEGMENTS]) {
							lineData.set([...point(t), t * 6], o);
							o += 4;
						}
					}
				}
				lineProgram.use();
				gl.uniformMatrix4fv(lineProgram.uniforms.u_viewProj!, false, camera.viewProj);
				gl.uniform3fv(lineProgram.uniforms.u_ink!, palette.fg);
				gl.uniform3fv(lineProgram.uniforms.u_paper!, palette.bg);
				gl.uniform1f(lineProgram.uniforms.u_time!, time);
				gl.uniform1f(lineProgram.uniforms.u_live!, playing.value ? 1 : 0);
				gl.bindVertexArray(lineVao);
				gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.DYNAMIC_DRAW);
				gl.drawArrays(gl.LINES, 0, lineData.length / 4);
			};
			glReady.value = true;
		} catch (error) {
			console.error(error);
		}
	}

	let opened = false;
	const start = performance.now();
	const stop = startLoop((time, delta) => {
		// Turning the page over: the camera starts looking straight down at it, then tilts to see the joints.
		const elapsed = (performance.now() - start) / 1000;
		if (!reduce && elapsed < 0.6) {
			camera.pitch = 1.5;
			camera.yaw = 0;
		} else {
			camera.yaw = damp(camera.yaw, wantYaw, reduce ? 60 : 2.4, delta);
			camera.pitch = damp(camera.pitch, wantPitch, reduce ? 60 : 2.4, delta);
		}
		if (!opened && elapsed > (reduce ? 0 : 2.2)) {
			opened = true;
			if (!openId.value) setOpen("intro");
		}

		const width = root.value?.clientWidth ?? innerWidth;
		const height = root.value?.clientHeight ?? innerHeight;
		camera.width = width;
		camera.height = height;
		camera.aspect = width / height;
		// Back off far enough to fit the assembly on narrow screens.
		const fit = Math.max(1, 1.25 / camera.aspect);
		camera.distance = damp(camera.distance, 31 * fit * zoom, 6, delta);
		const cosPitch = Math.cos(camera.pitch);
		camera.eye = [
			target[0] + Math.sin(camera.yaw) * cosPitch * camera.distance,
			target[1] + Math.sin(camera.pitch) * camera.distance,
			target[2] + Math.cos(camera.yaw) * cosPitch * camera.distance,
		];
		camera.viewProj = multiply(perspective(FOV, camera.aspect, 0.5, 200), lookAt(camera.eye, target, Math.abs(camera.pitch) > 1.49 ? [0, 0, -1] : UP));

		// Each piece moves on a stiff, lightly damped spring: it overshoots a hair and seats.
		for (const piece of pieces.value) {
			const state = stateOf(piece.id);
			if (drag?.id === piece.id) continue;
			const before = state.pull;
			if (reduce) state.pull = state.target;
			else {
				state.vel += (140 * (state.target - state.pull) - 15 * state.vel) * delta;
				state.pull += state.vel * delta;
				if (state.target === 0 && state.pull < 0) {
					if (before > 0.002 && soundOn.value) pluck({ frequency: 520 + Math.random() * 60, velocity: clamp(Math.abs(state.vel) / 12, 0.2, 0.8), brightness: 0.95, sustain: 0.12 });
					state.pull = 0;
					state.vel = 0;
				}
			}
		}

		const place = (el: HTMLElement | null | undefined, point: Vec3, dx = 0, dy = 0) => {
			if (!el) return;
			const p = project(camera.viewProj, point, width, height);
			el.style.transform = `translate3d(${p.x + dx}px, ${p.y + dy}px, 0)`;
			el.style.visibility = p.behind ? "hidden" : "";
		};
		for (const piece of pieces.value) {
			const centre = centreOf(piece);
			place(labelEls.get(piece.id), [centre[0], centre[1] + piece.size[1] / 2, centre[2]]);
		}
		for (const source of sources) place(sourceEls.get(source.id), source.at, 0, -18);
		if (openPiece.value) {
			const centre = centreOf(openPiece.value);
			place(card.value, [centre[0], centre[1] + openPiece.value.size[1] / 2, centre[2]], 0, -16);
		}

		render?.(time);
	});

	onUnmounted(() => {
		stop();
		stopPalette();
		gl?.getExtension("WEBGL_lose_context")?.loseContext();
	});
});

const showLabel = (piece: Piece) => piece.reach > 0 && (exploded.value || piece.id === hoverId.value) && piece.id !== openId.value;
</script>

<template>
	<div ref="root" class="joinery">
		<canvas
			ref="canvas"
			class="joinery__canvas"
			:style="{ cursor }"
			aria-hidden="true"
			@pointerdown="onPointerDown"
			@pointermove="onPointerMove"
			@pointerup="onPointerUp"
			@pointercancel="onPointerUp"
			@wheel="onWheel"
		/>

		<div class="joinery__labels" aria-hidden="true">
			<span v-for="piece in pieces" :key="piece.id" :ref="setEl(labelEls, piece.id)" class="label mono" :class="{ 'is-on': showLabel(piece) }">{{ piece.label }}</span>
			<span v-for="source in sources" :key="source.id" :ref="setEl(sourceEls, source.id)" class="label label--source mono is-on">{{ source.label }}</span>
		</div>

		<article v-if="openPiece" ref="card" class="card" :class="`card--${openPiece.content.type}`">
			<p class="card__file mono">
				<span>{{ openPiece.label }}</span
				><span class="muted">{{ openPiece.file }}</span>
			</p>
			<template v-if="openPiece.content.type === 'app'" />
			<nav v-else-if="openPiece.content.type === 'links'" class="card__links mono" aria-label="Main">
				<NuxtLink to="/">abdullahi</NuxtLink>
				<NuxtLink to="/projects">projects</NuxtLink>
				<NuxtLink to="/writings">writing</NuxtLink>
				<a href="#" @click.prevent="setOpen('contact')">contact</a>
			</nav>
			<template v-else-if="openPiece.content.type === 'hero'">
				<p class="mono muted">{{ profile.kicker }}</p>
				<p class="card__name">
					{{ profile.name.first }} <em>{{ profile.name.last }}</em>
				</p>
			</template>
			<template v-else-if="openPiece.content.type === 'intro'">
				<h1 class="card__name">
					{{ profile.name.first }} <em>{{ profile.name.last }}</em>
				</h1>
				<p class="card__text">{{ profile.lede }} {{ profile.aside }}</p>
			</template>
			<NowLine v-else-if="openPiece.content.type === 'now'" class="card__text" />
			<template v-else-if="openPiece.content.type === 'ganbaru'">
				<p lang="ja" class="card__glyphs">{{ profile.ganbaru.word }}</p>
				<p class="mono muted">
					<i>{{ profile.ganbaru.reading }}</i
					>: {{ profile.ganbaru.gloss }}
				</p>
			</template>
			<template v-else-if="openPiece.content.type === 'projects'">
				<p class="mono muted">side projects · {{ content.projects.length }}</p>
				<ul class="card__list">
					<li v-for="project in content.projects" :key="project.link">
						<a :href="project.link" target="_blank" rel="noopener noreferrer">{{ project.title }}</a>
						<span class="muted">{{ project.about }}</span>
					</li>
				</ul>
			</template>
			<template v-else-if="openPiece.content.type === 'project'">
				<a :href="openPiece.content.project.link" target="_blank" rel="noopener noreferrer" class="card__title">{{ openPiece.content.project.title }} ↗</a>
				<p class="card__text muted">{{ openPiece.content.project.about }}</p>
				<p class="mono muted">{{ formatMonthYear(openPiece.content.project.date) }} · {{ hostOf(openPiece.content.project.link) }}</p>
			</template>
			<template v-else-if="openPiece.content.type === 'writings'">
				<p class="mono muted">writing · {{ content.writings.length }}</p>
				<ul class="card__list">
					<li v-for="writing in content.writings" :key="writing.slug">
						<NuxtLink :to="`/writings/${writing.slug}`">{{ writing.title }}</NuxtLink>
						<span class="mono muted">{{ formatMonthYear(writing.createdAt) }} · {{ writing.readTime }} min</span>
					</li>
				</ul>
			</template>
			<template v-else-if="openPiece.content.type === 'writing'">
				<NuxtLink :to="`/writings/${openPiece.content.writing.slug}`" class="card__title">{{ openPiece.content.writing.title }}</NuxtLink>
				<p class="card__text muted">{{ openPiece.content.writing.description }}</p>
				<p class="mono muted">{{ formatMonthYear(openPiece.content.writing.createdAt) }} · {{ openPiece.content.writing.readTime }} min</p>
			</template>
			<p v-else-if="openPiece.content.type === 'contact'" class="card__text">
				Write to me at <a :href="`mailto:${profile.email}`">{{ profile.email }}</a
				>, or find me on
				<template v-for="(link, i) in profile.links" :key="link.href"
					><a :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.label }}</a
					>{{ i === profile.links.length - 2 ? " and " : i < profile.links.length - 1 ? ", " : "." }}</template
				>
			</p>
			<template v-else-if="openPiece.content.type === 'footer'">
				<p class="card__text">
					{{ profile.ganbaru.sum }} <span class="muted">{{ profile.ganbaru.kept }}</span>
				</p>
			</template>
			<template v-else-if="openPiece.content.type === 'glyph'">
				<p lang="ja" class="card__glyphs">{{ openPiece.content.glyph }}</p>
				<p class="mono muted">{{ openPiece.content.reading }}</p>
				<p class="card__text">{{ openPiece.content.meaning }}</p>
			</template>
		</article>

		<aside class="tree">
			<p class="tree__title mono"><span lang="ja">継手</span> tsugite · how this site fits together</p>
			<ul class="tree__list" role="tree" aria-label="Component tree">
				<template v-for="piece in pieces" :key="piece.id">
					<li v-if="piece.reach > 0" role="treeitem" :aria-level="ancestorsOf(piece.id).length" :style="{ '--depth': ancestorsOf(piece.id).length - 1 }">
						<button
							type="button"
							class="tree__node mono"
							:class="{ 'is-hover': hoverId === piece.id }"
							:aria-pressed="openId === piece.id"
							@click="toggle(piece.id)"
							@mouseenter="hoverId = piece.id"
							@mouseleave="hoverId = null"
							@focus="hoverId = piece.id"
							@blur="hoverId = null"
						>
							{{ piece.label }}
						</button>
					</li>
				</template>
			</ul>
			<div class="tree__controls mono">
				<button type="button" :aria-pressed="exploded" @click="setExploded(!exploded)">{{ exploded ? "assemble" : "exploded view" }}</button>
				<RoomSound />
			</div>
			<p class="tree__hint mono muted">pull a piece out along its joint · drag the space around it to turn the whole thing</p>
		</aside>

		<div v-if="!glReady" class="joinery__fallback mono muted">This room needs WebGL2. The tree beside you opens every piece.</div>
	</div>
</template>

<style scoped>
.joinery {
	position: relative;
	height: 100svh;
	overflow: hidden;
}
.joinery__canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	touch-action: none;
}
.joinery__labels {
	position: absolute;
	inset: 0;
	pointer-events: none;
}
.label {
	position: absolute;
	top: 0;
	left: 0;
	translate: -50% -130%;
	padding: 0.1rem 0.35rem;
	background: var(--bg);
	white-space: nowrap;
	opacity: 0;
	transition: opacity 250ms ease;
}
.label.is-on {
	opacity: 1;
}
.label--source {
	color: var(--muted);
	border: 1px solid var(--rule);
}

.card {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 3;
	translate: -50% -100%;
	display: grid;
	gap: 0.55rem;
	width: min(24rem, 80vw);
	max-height: 50vh;
	overflow-y: auto;
	padding: 0.9rem 1rem 1rem;
	background: var(--bg);
	border: 1px solid var(--fg);
	box-shadow:
		6px 6px 0 -1px var(--bg),
		6px 6px 0 0 var(--fg);
}
.card--projects,
.card--writings {
	width: min(30rem, 86vw);
}
.card__file {
	display: flex;
	justify-content: space-between;
	gap: 1rem;
	padding-bottom: 0.45rem;
	border-bottom: 1px solid var(--rule);
}
.card__name {
	font-weight: 300;
	font-size: clamp(2rem, 4vw, 3rem);
	line-height: 0.95;
	letter-spacing: -0.03em;
}
.card__name em {
	display: block;
	font-weight: 250;
}
.card__text {
	font-size: 1rem;
	line-height: 1.5;
	text-wrap: pretty;
}
.card__text a,
.card__list a,
.card__title {
	font-style: italic;
}
.card__text a {
	background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 100% 1px;
	overflow-wrap: anywhere;
}
.card__title {
	font-size: 1.5rem;
	line-height: 1.15;
}
.card__glyphs {
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-weight: 800;
	font-size: 2.5rem;
	line-height: 1;
}
.card__links {
	display: flex;
	gap: 1rem;
}
.card__list {
	display: grid;
	gap: 0.5rem;
}
.card__list li {
	display: grid;
	gap: 0.1rem;
	font-size: 0.95rem;
	line-height: 1.35;
}

.tree {
	position: absolute;
	top: 1.5rem;
	left: var(--gutter);
	bottom: 1.25rem;
	z-index: 2;
	display: flex;
	flex-direction: column;
	gap: 0.9rem;
	width: 17rem;
	pointer-events: none;
}
.tree > * {
	pointer-events: auto;
}
.tree__title [lang="ja"] {
	color: var(--fg);
}
.tree__title {
	color: var(--muted);
}
.tree__list {
	overflow-y: auto;
	min-height: 0;
	flex: 0 1 auto;
}
.tree__node {
	display: block;
	width: 100%;
	padding: 0.2rem 0 0.2rem calc(var(--depth, 0) * 0.9rem);
	text-align: left;
	color: var(--muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	transition: color 150ms ease;
}
.tree__node.is-hover,
.tree__node:hover,
.tree__node[aria-pressed="true"] {
	color: var(--fg);
}
.tree__node[aria-pressed="true"]::before {
	content: "↥ ";
}
.tree__controls {
	display: flex;
	align-items: center;
	gap: 1.25rem;
}
.tree__controls > button:first-child {
	padding: 0.5rem 0;
	color: var(--fg);
	background: linear-gradient(currentColor, currentColor) no-repeat 0 85% / 100% 1px;
}
.joinery__fallback {
	position: absolute;
	right: var(--gutter);
	bottom: 2rem;
	max-width: 20rem;
}

@media (max-width: 52rem) {
	.tree {
		top: auto;
		right: var(--gutter);
		width: auto;
		max-height: 36svh;
		padding-top: 0.75rem;
		background: linear-gradient(to bottom, transparent, var(--bg) 1rem);
	}
	.tree__title,
	.tree__hint {
		display: none;
	}
	.card {
		max-height: 42svh;
	}
}
</style>
