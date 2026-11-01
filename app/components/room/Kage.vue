<script setup lang="ts">
import type { RoomContent } from "~/composables/useRoomContent";
import {
	FULLSCREEN_VS,
	bindTarget,
	bindTexture,
	clamp,
	createFullscreenTriangle,
	createGL,
	createProgram,
	createTarget,
	damp,
	deleteTarget,
	fitCanvas,
	prefersReducedMotion,
	readPalette,
	startLoop,
	watchPalette,
	type Palette,
	type Target,
} from "~/lib/gl";
import { compassName, sunPosition } from "~/lib/sun";

/*
 * 影: shadow, and in older usage, light itself. Everything is a sheet of paper on a table, lit by the sun
 * over Lagos at this exact moment: long shadows from the east in my morning, short ones at noon, none at
 * night. You hold a lamp. Pick a sheet up and its shadow grows and softens as it leaves the table.
 * Shadows are raymarched against the real positions and heights of every sheet, so they fall across each other.
 */

const props = defineProps<{ content: RoomContent }>();
const { clock, lateNight } = useNowPlaying();
const takeArrival = useRoomArrival();

type Sheet =
	| { key: string; kind: "intro"; span: 2 }
	| { key: string; kind: "project"; span: 1; title: string; about: string; link: string; date: string }
	| { key: string; kind: "writing"; span: 1; title: string; slug: string; date: string; readTime: number; description: string }
	| { key: string; kind: "contact"; span: 1 }
	| { key: string; kind: "ganbaru"; span: 1 };

const sheets = computed<Sheet[]>(() => [
	{ key: "intro", kind: "intro", span: 2 },
	...props.content.projects.map((project) => ({ key: `p:${project.link}`, kind: "project" as const, span: 1 as const, ...project })),
	...props.content.writings.map((post) => ({
		key: `w:${post.slug}`,
		kind: "writing" as const,
		span: 1 as const,
		title: post.title,
		slug: post.slug,
		date: post.createdAt,
		readTime: post.readTime,
		description: post.description,
	})),
	{ key: "contact", kind: "contact", span: 1 },
	{ key: "ganbaru", kind: "ganbaru", span: 1 },
]);

/* ─── Layout: a loose masonry, each sheet set down by hand, a little off square ─── */

interface Body {
	x: number; // centre, page coordinates
	y: number;
	w: number;
	h: number;
	rot: number;
	rest: number; // resting angle
	lift: number;
	vx: number;
	vy: number;
	z: number;
}

const bodies = new Map<string, Body>();
const sheetEls = new Map<string, HTMLElement>();
const setSheet = (key: string) => (el: unknown) => {
	const node = el && typeof el === "object" && "$el" in el ? (el as { $el: unknown }).$el : el;
	if (node instanceof HTMLElement) sheetEls.set(key, node);
	else sheetEls.delete(key);
};

const tableHeight = ref(0);
const grid = reactive({ column: 300, gap: 32, columns: 3 });
const sheetWidth = (sheet: Sheet) => {
	const span = Math.min(sheet.span, grid.columns);
	return grid.column * span + grid.gap * (span - 1);
};
const laidOut = ref(false);
let stack = 0;

const hash = (text: string) => {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
	return ((h >>> 0) % 10_000) / 10_000;
};

const layout = () => {
	const width = innerWidth;
	const gutter = clamp(width * 0.05, 16, 56);
	const gap = clamp(width * 0.03, 18, 40);
	const columns = clamp(Math.floor((width - gutter * 2 + gap) / (290 + gap)), 1, 4);
	const column = (width - gutter * 2 - gap * (columns - 1)) / columns;
	Object.assign(grid, { column, gap, columns });
	return nextTick(() => {
		const heights = new Array<number>(columns).fill(clamp(innerHeight * 0.14, 80, 140));
		for (const sheet of sheets.value) {
			const el = sheetEls.get(sheet.key);
			if (!el) continue;
			const span = Math.min(sheet.span, columns);
			let col = 0;
			let best = Infinity;
			for (let c = 0; c <= columns - span; c++) {
				const top = Math.max(...heights.slice(c, c + span));
				if (top < best - 1) {
					best = top;
					col = c;
				}
			}
			const w = sheetWidth(sheet);
			const h = el.offsetHeight;
			const jitter = hash(sheet.key);
			const x = gutter + col * (column + gap) + w / 2 + (jitter - 0.5) * gap * 0.5;
			const y = best + h / 2 + jitter * gap * 0.4;
			const rest = (hash(`${sheet.key}r`) - 0.5) * (span > 1 ? 0.012 : 0.05);
			const existing = bodies.get(sheet.key);
			bodies.set(sheet.key, { x, y, w, h, rot: existing?.rot ?? rest, rest, lift: existing?.lift ?? 0, vx: 0, vy: 0, z: existing?.z ?? stack++ });
			for (let c = col; c < col + span; c++) heights[c] = y + h / 2 + gap;
		}
		tableHeight.value = Math.max(...heights) + 120;
		laidOut.value = true;
	});
};

/* ─── Pointer: the lamp, and picking sheets up ─── */

const pointer = { x: -1, y: -1, inside: false };
let drag: { key: string; dx: number; dy: number; lastX: number; lastY: number } | null = null;
let hoverKey: string | null = null;

const onSheetDown = (key: string, event: PointerEvent) => {
	if (event.pointerType === "touch" || event.button !== 0) return;
	if ((event.target as HTMLElement).closest("a, button")) return;
	const body = bodies.get(key);
	if (!body) return;
	event.preventDefault();
	drag = { key, dx: body.x - (event.clientX + scrollX), dy: body.y - (event.clientY + scrollY), lastX: event.clientX, lastY: event.clientY };
	body.z = stack++;
};
const onMove = (event: PointerEvent) => {
	pointer.x = event.clientX;
	pointer.y = event.clientY;
	pointer.inside = true;
	const sheet = (event.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-sheet]");
	hoverKey = sheet?.dataset.sheet ?? null;
};
const onUp = () => {
	drag = null;
};
const onLeave = () => {
	pointer.inside = false;
	hoverKey = null;
};

/* ─── Shaders ─── */

const MAX = 32;

const cards = /* glsl */ `
uniform vec4 u_cards[${MAX}];   // centre x, centre y, half width, half height (css px, screen)
uniform vec2 u_cardsB[${MAX}];  // rotation, height above the table (px)
uniform int u_count;

float sdCard(vec2 p, int i) {
	vec4 c = u_cards[i];
	float r = u_cardsB[i].x;
	vec2 q = p - c.xy;
	q = vec2(cos(r) * q.x + sin(r) * q.y, -sin(r) * q.x + cos(r) * q.y);
	vec2 d = abs(q) - c.zw + 2.0;
	return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 2.0;
}

// The height of whatever is under this point: the highest sheet covering it, or the table.
float surface(vec2 p) {
	float h = 0.0;
	for (int i = 0; i < ${MAX}; i++) {
		if (i >= u_count) break;
		if (sdCard(p, i) < 0.0) h = max(h, u_cardsB[i].y);
	}
	return h;
}

// March toward the light. Only sheets standing above the ray can block it; the nearest miss sets the penumbra,
// which widens with distance, the way a shadow softens the further it falls from what casts it.
float shadow(vec2 p, float h0, vec2 dir, float slope, float maxT, float softness) {
	float lit = 1.0;
	float t = 1.5;
	for (int s = 0; s < 40; s++) {
		vec2 q = p + dir * t;
		float ray = h0 + t * slope;
		float nearest = 1e4;
		for (int i = 0; i < ${MAX}; i++) {
			if (i >= u_count) break;
			if (u_cardsB[i].y <= ray) continue;
			nearest = min(nearest, sdCard(q, i));
		}
		if (nearest < 1e3) lit = min(lit, clamp(nearest / (softness * t + 0.5), 0.0, 1.0));
		if (lit < 0.01 || t > maxT) break;
		t += clamp(nearest * 0.7, 1.5, 28.0);
	}
	return lit;
}
`;

const SHADOW_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 color;
uniform vec2 u_view;
uniform vec2 u_sunDir;     // on screen, toward the sun
uniform float u_sunSlope;  // tan(elevation)
uniform vec3 u_lamp;       // x, y on screen, height
${cards}
void main() {
	vec2 p = vec2(v_uv.x, 1.0 - v_uv.y) * u_view;
	float h0 = surface(p);
	float sun = u_sunSlope > 0.0 ? shadow(p, h0, u_sunDir, u_sunSlope, min(900.0, 60.0 / u_sunSlope), 0.04) : 0.0;
	vec2 toLamp = u_lamp.xy - p;
	float distance = length(toLamp);
	float lamp = shadow(p, h0, toLamp / max(distance, 1e-3), (u_lamp.z - h0) / max(distance, 1.0), distance, 0.12);
	color = vec4(sun, lamp, 0.0, 1.0);
}`;

const SCREEN_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 color;
uniform vec2 u_view;
uniform float u_dpr;
uniform sampler2D u_shadow;
uniform vec3 u_bg;
uniform vec3 u_fg;
uniform float u_dark;
uniform float u_sun;        // 0 at night, 1 in full day
uniform vec3 u_lamp;
uniform float u_lampPower;
uniform vec3 u_reveal;      // x, y, radius: the room is lit outward from where you clicked
uniform float u_time;
${cards}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
	vec2 p = vec2(gl_FragCoord.x, u_view.y * u_dpr - gl_FragCoord.y) / u_dpr;
	float h0 = 0.0;
	float edge = 1e4;
	float contact = 1.0;
	for (int i = 0; i < ${MAX}; i++) {
		if (i >= u_count) break;
		float d = sdCard(p, i);
		float h = u_cardsB[i].y;
		if (d < 0.0) h0 = max(h0, h);
		edge = min(edge, abs(d));
		// Where a sheet meets what's under it, a little light can't get in.
		contact *= 1.0 - 0.22 * exp(-max(d, 0.0) / (1.5 + h * 0.5)) * step(0.0, d) * smoothstep(0.0, 6.0, h + 2.0);
	}

	vec3 table = mix(u_bg, u_fg, mix(0.06, 0.0, u_dark)) * mix(1.0, 0.82, u_dark);
	vec3 paper = mix(mix(u_bg, vec3(1.0), 0.6), mix(u_bg, u_fg, 0.1), u_dark);
	vec3 base = h0 > 0.0 ? paper : table;

	vec2 shade = texture(u_shadow, v_uv).rg;
	float toLamp = length(u_lamp.xy - p);
	float falloff = u_lampPower / (1.0 + toLamp * toLamp / 260000.0);
	float light = 0.72 + u_sun * 0.3 * shade.r + falloff * shade.g * 0.4;
	vec3 col = base * light * contact;
	col = mix(col, u_fg, (1.0 - clamp(edge * u_dpr - 0.2, 0.0, 1.0)) * 0.14);

	float lit = smoothstep(u_reveal.z, u_reveal.z - 220.0, length(p - u_reveal.xy));
	col *= mix(0.55, 1.0, lit);

	col += (hash(gl_FragCoord.xy + fract(u_time) * 17.0) - 0.5) * 0.02;
	color = vec4(col, 1.0);
}`;

/* ─── Copy for the light ─── */

const sky = ref({ elevation: 0, azimuth: 0 });
const lightNote = computed(() => {
	const degrees = Math.round((sky.value.elevation * 180) / Math.PI);
	if (degrees <= 0) return `it’s ${clock.value || "night"} in Lagos and the sun is down, so the only light here is the one you’re holding`;
	return `lit by the sun over Lagos at ${clock.value}: ${degrees}° up, from the ${compassName(sky.value.azimuth)}`;
});

const canvas = ref<HTMLCanvasElement | null>(null);
const glReady = ref(false);

onMounted(async () => {
	const reduce = prefersReducedMotion();
	const arrival = takeArrival();
	await document.fonts.ready;
	await layout();

	let palette: Palette = readPalette();
	const stopPalette = watchPalette((next) => (palette = next));
	const lamp = { x: arrival.x, y: arrival.y };
	const start = performance.now();
	let lampPower = 0.3;
	let sun = 0;

	const gl = canvas.value ? createGL(canvas.value, { alpha: false }) : null;
	let render: ((time: number, uniforms: { list: Body[]; reveal: number }) => void) | null = null;
	let disposeGL = () => {};

	if (gl) {
		try {
			const shadowProgram = createProgram(gl, FULLSCREEN_VS, SHADOW_FS);
			const screenProgram = createProgram(gl, FULLSCREEN_VS, SCREEN_FS);
			const triangle = createFullscreenTriangle(gl);
			let shadowTarget: Target | null = null;
			const cardA = new Float32Array(MAX * 4);
			const cardB = new Float32Array(MAX * 2);

			const setCards = (u: Record<string, WebGLUniformLocation>, count: number) => {
				gl.uniform4fv(u.u_cards!, cardA);
				gl.uniform2fv(u.u_cardsB!, cardB);
				gl.uniform1i(u.u_count!, count);
			};

			render = (time, { list, reveal }) => {
				fitCanvas(canvas.value!);
				const width = innerWidth;
				const height = innerHeight;
				// Shadows are soft; a quarter of the pixels is plenty and keeps the march cheap.
				const sw = Math.max(1, Math.round(width / 3));
				const sh = Math.max(1, Math.round(height / 3));
				if (!shadowTarget || shadowTarget.width !== sw || shadowTarget.height !== sh) {
					if (shadowTarget) deleteTarget(gl, shadowTarget);
					shadowTarget = createTarget(gl, sw, sh, { internalFormat: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE });
				}

				let count = 0;
				for (const body of list) {
					const top = body.y - scrollY;
					if (count >= MAX || top + body.h < -300 || top - body.h > height + 300) continue;
					cardA.set([body.x - scrollX, top, body.w / 2, body.h / 2], count * 4);
					cardB.set([body.rot, 2 + body.lift], count * 2);
					count++;
				}

				const elevation = sky.value.elevation;
				const azimuth = sky.value.azimuth;
				shadowProgram.use();
				bindTarget(gl, shadowTarget);
				gl.uniform2f(shadowProgram.uniforms.u_view!, width, height);
				// North is up the screen; east is to the right.
				gl.uniform2f(shadowProgram.uniforms.u_sunDir!, Math.sin(azimuth), -Math.cos(azimuth));
				gl.uniform1f(shadowProgram.uniforms.u_sunSlope!, elevation > 0.01 ? Math.tan(elevation) : -1);
				gl.uniform3f(shadowProgram.uniforms.u_lamp!, lamp.x, lamp.y, 340);
				setCards(shadowProgram.uniforms, count);
				triangle();

				screenProgram.use();
				bindTarget(gl, null);
				gl.uniform2f(screenProgram.uniforms.u_view!, width, height);
				gl.uniform1f(screenProgram.uniforms.u_dpr!, gl.drawingBufferWidth / width);
				gl.uniform1i(screenProgram.uniforms.u_shadow!, bindTexture(gl, 0, shadowTarget.texture));
				gl.uniform3fv(screenProgram.uniforms.u_bg!, palette.bg);
				gl.uniform3fv(screenProgram.uniforms.u_fg!, palette.fg);
				gl.uniform1f(screenProgram.uniforms.u_dark!, palette.dark ? 1 : 0);
				gl.uniform1f(screenProgram.uniforms.u_sun!, sun);
				gl.uniform3f(screenProgram.uniforms.u_lamp!, lamp.x, lamp.y, 340);
				gl.uniform1f(screenProgram.uniforms.u_lampPower!, lampPower);
				gl.uniform3f(screenProgram.uniforms.u_reveal!, arrival.x, arrival.y, reveal);
				gl.uniform1f(screenProgram.uniforms.u_time!, time);
				setCards(screenProgram.uniforms, count);
				triangle();
			};
			disposeGL = () => {
				if (shadowTarget) deleteTarget(gl, shadowTarget);
				gl.getExtension("WEBGL_lose_context")?.loseContext();
			};
			glReady.value = true;
		} catch (error) {
			console.error(error);
		}
	}

	const updateSky = () => (sky.value = sunPosition(new Date()));
	updateSky();
	const skyTimer = setInterval(updateSky, 30_000);

	const stop = startLoop((time, delta) => {
		const list = [...bodies.values()].sort((a, b) => a.z - b.z);
		const ranked = new Map(list.map((body, i) => [body, i]));

		for (const [key, body] of bodies) {
			const held = drag?.key === key;
			// Resting sheets lie at slightly different heights, so a stack casts onto itself.
			const resting = (ranked.get(body) ?? 0) * 0.25;
			const wanted = held ? 36 : key === hoverKey ? resting + 5 : resting;
			body.lift = reduce ? wanted : damp(body.lift, wanted, held ? 14 : 7, delta);

			if (held) {
				const tx = pointer.x + scrollX + drag!.dx;
				const ty = pointer.y + scrollY + drag!.dy;
				const nx = damp(body.x, tx, 30, delta);
				const ny = damp(body.y, ty, 30, delta);
				body.vx = (nx - body.x) / Math.max(delta, 1 / 240);
				body.vy = (ny - body.y) / Math.max(delta, 1 / 240);
				body.x = nx;
				body.y = ny;
				// Carried paper trails its corner a little in the direction it's moving.
				body.rot = damp(body.rot, body.rest + clamp(body.vx * 0.00012, -0.12, 0.12), 8, delta);
			} else {
				// Let go, it slides a little further on the table.
				body.x += body.vx * delta;
				body.y += body.vy * delta;
				body.vx *= Math.exp(-delta * 7);
				body.vy *= Math.exp(-delta * 7);
				body.x = clamp(body.x, body.w * 0.2, innerWidth - body.w * 0.2);
				body.y = clamp(body.y, body.h * 0.2, tableHeight.value - body.h * 0.2);
				body.rot = damp(body.rot, body.rest, 4, delta);
			}

			const el = sheetEls.get(key);
			if (el) {
				el.style.transform = `translate3d(${body.x - body.w / 2}px, ${body.y - body.h / 2}px, 0) rotate(${body.rot}rad) scale(${1 + body.lift * 0.0012})`;
				el.style.zIndex = String(10 + (ranked.get(body) ?? 0));
			}
		}

		// The lamp follows your hand. With no hand on the page it rests by my name, and only matters at night.
		const restX = (bodies.get("intro")?.x ?? innerWidth / 2) - scrollX + 120;
		const restY = (bodies.get("intro")?.y ?? innerHeight / 3) - scrollY - 80;
		lamp.x = damp(lamp.x, pointer.inside ? pointer.x : restX, reduce ? 60 : 10, delta);
		lamp.y = damp(lamp.y, pointer.inside ? pointer.y : restY, reduce ? 60 : 10, delta);
		const night = lateNight.value || sky.value.elevation <= 0;
		sun = damp(sun, clamp(Math.sin(sky.value.elevation) * 4, 0, 1), 2, delta);
		lampPower = damp(lampPower, pointer.inside ? (night ? 0.8 : 0.32) : night ? 0.55 : 0, 4, delta);

		const elapsed = (performance.now() - start) / 1000;
		const reveal = reduce ? 1e5 : Math.pow(Math.min(1, elapsed / 1.8), 0.6) * Math.hypot(innerWidth, innerHeight) * 1.2 + 10;
		render?.(time, { list, reveal });
	});

	const onResize = () => void layout();
	addEventListener("resize", onResize);
	addEventListener("pointermove", onMove, { passive: true });
	addEventListener("pointerup", onUp);
	document.documentElement.addEventListener("pointerleave", onLeave);

	onUnmounted(() => {
		stop();
		stopPalette();
		clearInterval(skyTimer);
		removeEventListener("resize", onResize);
		removeEventListener("pointermove", onMove);
		removeEventListener("pointerup", onUp);
		document.documentElement.removeEventListener("pointerleave", onLeave);
		disposeGL();
	});
});
</script>

<template>
	<div class="kage" :class="{ 'is-ready': laidOut, 'has-gl': glReady }" :style="{ height: tableHeight ? `${tableHeight}px` : '100svh' }">
		<canvas ref="canvas" class="kage__canvas" aria-hidden="true" />

		<article
			v-for="sheet in sheets"
			:key="sheet.key"
			:ref="setSheet(sheet.key)"
			class="sheet"
			:class="`sheet--${sheet.kind}`"
			:data-sheet="sheet.key"
			:style="{ width: `${sheetWidth(sheet)}px` }"
			@pointerdown="onSheetDown(sheet.key, $event)"
		>
			<template v-if="sheet.kind === 'intro'">
				<p class="mono muted">{{ profile.kicker }}</p>
				<h1 class="sheet__name">
					{{ profile.name.first }} <em>{{ profile.name.last }}</em>
				</h1>
				<p class="sheet__lede">{{ profile.lede }} {{ profile.aside }}</p>
				<NowLine class="sheet__now" />
			</template>
			<template v-else-if="sheet.kind === 'project'">
				<p class="mono muted">{{ formatMonthYear(sheet.date) }}</p>
				<h2 class="sheet__title">
					<a :href="sheet.link" target="_blank" rel="noopener noreferrer">{{ sheet.title }}</a>
				</h2>
				<p class="sheet__text">{{ sheet.about }}</p>
				<p class="mono muted">{{ hostOf(sheet.link) }} ↗</p>
			</template>
			<template v-else-if="sheet.kind === 'writing'">
				<p class="mono muted">writing · {{ formatMonthYear(sheet.date) }} · {{ sheet.readTime }} min</p>
				<h2 class="sheet__title sheet__title--writing">
					<NuxtLink :to="`/writings/${sheet.slug}`">{{ sheet.title }}</NuxtLink>
				</h2>
				<p class="sheet__text">{{ sheet.description }}</p>
			</template>
			<template v-else-if="sheet.kind === 'contact'">
				<p class="mono muted">contact</p>
				<p class="sheet__contact">
					Write to me at <a :href="`mailto:${profile.email}`">{{ profile.email }}</a
					>, or find me on
					<template v-for="(link, i) in profile.links" :key="link.href"
						><a :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.label }}</a
						>{{ i === profile.links.length - 2 ? " and " : i < profile.links.length - 1 ? ", " : "." }}</template
					>
				</p>
			</template>
			<template v-else>
				<p lang="ja" class="sheet__glyphs">{{ profile.ganbaru.word }}</p>
				<p class="mono muted"><i>{{ profile.ganbaru.reading }}</i>: {{ profile.ganbaru.gloss }}</p>
			</template>
		</article>

		<footer class="hud mono">
			<span lang="ja" class="hud__seed" data-room-seed aria-hidden="true">影</span>
			<span class="hud__note">{{ lightNote }}</span>
			<span class="hud__hint muted">move to hold a lamp · pick a sheet up and carry it</span>
		</footer>
	</div>
</template>

<style scoped>
.kage {
	position: relative;
	overflow: hidden;
}
.kage__canvas {
	position: fixed;
	inset: 0;
	width: 100%;
	height: 100%;
}

.sheet {
	position: absolute;
	top: 0;
	left: 0;
	display: grid;
	align-content: start;
	gap: 0.55rem;
	padding: 1.25rem 1.3rem 1.4rem;
	transform-origin: 50% 50%;
	opacity: 0;
	cursor: grab;
	user-select: none;
	will-change: transform;
}
.kage.is-ready .sheet {
	opacity: 1;
	transition: opacity 600ms ease;
}
.sheet:active {
	cursor: grabbing;
}
/* Without WebGL the sheets still need to read as paper. */
.kage:not(.has-gl) .sheet {
	background: color-mix(in srgb, var(--bg) 40%, white);
	box-shadow: 0 1px 0 var(--rule), 0 8px 24px -16px color-mix(in srgb, var(--fg) 40%, transparent);
}
:global(html.dark) .kage:not(.has-gl) .sheet {
	background: color-mix(in srgb, var(--bg) 90%, var(--fg));
}
.sheet a {
	user-select: text;
}
.sheet--intro {
	padding: 1.75rem 1.75rem 2rem;
	gap: 1rem;
}
.sheet__name {
	font-weight: 300;
	font-size: clamp(2.5rem, 6vw, 5rem);
	line-height: 0.92;
	letter-spacing: -0.035em;
}
.sheet__name em {
	display: block;
	font-weight: 250;
}
.sheet__lede {
	max-width: 32rem;
	font-size: 1.125rem;
	line-height: 1.5;
	text-wrap: pretty;
}
.sheet__now {
	font-size: 1rem;
}
.sheet__title {
	font-weight: 400;
	font-size: 1.5rem;
	line-height: 1.15;
	letter-spacing: -0.01em;
}
.sheet__title a:hover,
.sheet__title--writing {
	font-style: italic;
}
.sheet__text {
	color: var(--muted);
	font-size: 1rem;
	line-height: 1.45;
	text-wrap: pretty;
}
.sheet__contact {
	font-weight: 300;
	font-size: 1.4rem;
	line-height: 1.3;
}
.sheet__contact a {
	font-style: italic;
	background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 100% 1px;
	overflow-wrap: anywhere;
}
.sheet__glyphs {
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-weight: 800;
	font-size: 3.25rem;
	line-height: 1;
}

.hud {
	position: fixed;
	z-index: 100;
	left: var(--gutter);
	right: var(--gutter);
	bottom: 1.1rem;
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 0.4rem 1.25rem;
	pointer-events: none;
}
.hud > span {
	padding: 0.15rem 0.4rem;
	background: color-mix(in srgb, var(--bg) 85%, transparent);
}
.hud__seed {
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-size: 1.25rem;
	line-height: 1;
}
@media (max-width: 40rem) {
	.hud__hint {
		display: none;
	}
}
</style>
