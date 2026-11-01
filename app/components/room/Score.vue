<script setup lang="ts">
import type { RoomContent } from "~/composables/useRoomContent";
import { bell } from "~/lib/audio";
import {
	FULLSCREEN_VS,
	bindTarget,
	clamp,
	createFullscreenTriangle,
	createGL,
	createProgram,
	damp,
	fitCanvas,
	prefersReducedMotion,
	readPalette,
	startLoop,
	watchPalette,
	type Palette,
} from "~/lib/gl";

/*
 * 譜: a score. My years are cut as one spiral groove, one turn per year, oldest at the centre.
 * The needle starts on the outer edge, on whatever I'm listening to right now. Scrolling plays the record
 * backwards through time; every piece of work is a mark in the groove that rings as the needle crosses it.
 */

const props = defineProps<{ content: RoomContent }>();
const now = useNowPlaying();
const { enabled: soundOn } = useRoomSound();

const DAY = 86_400_000;
const YEAR = 365.25 * DAY;
const MAX_NOTES = 64;
const NEEDLE_ANGLE = -Math.PI / 4; // the needle sits up and to the right, on a straight rail

interface Note {
	key: string;
	side: "A" | "B";
	number: number;
	kind: "writing" | "project";
	title: string;
	detail: string;
	meta: string;
	href: string;
	external: boolean;
	time: number;
}

const notes = computed<Note[]>(() => {
	const writing = props.content.writings.map((post, i) => ({
		key: `w:${post.slug}`,
		side: "A" as const,
		number: i + 1,
		kind: "writing" as const,
		title: post.title,
		detail: post.description,
		meta: `${formatMonthYear(post.createdAt)} · ${post.readTime} min read`,
		href: `/writings/${post.slug}`,
		external: false,
		time: Date.parse(post.createdAt),
	}));
	const projects = props.content.projects.map((project, i) => ({
		key: `p:${project.link}`,
		side: "B" as const,
		number: i + 1,
		kind: "project" as const,
		title: project.title,
		detail: project.about,
		meta: `${formatMonthYear(project.date)} · ${hostOf(project.link)}`,
		href: project.link,
		external: true,
		time: Date.parse(project.date),
	}));
	return [...writing, ...projects].sort((a, b) => b.time - a.time).slice(0, MAX_NOTES);
});

const sides = computed(() => ({
	A: notes.value.filter((note) => note.side === "A").sort((a, b) => a.number - b.number),
	B: notes.value.filter((note) => note.side === "B").sort((a, b) => a.number - b.number),
}));

// The record starts on the first of January of the oldest year, so every turn begins at the same angle.
const span = computed(() => {
	const times = notes.value.map((note) => note.time);
	const newest = Math.max(Date.now(), ...times);
	const oldestNote = times.length ? Math.min(...times) : newest - YEAR;
	const start = Date.UTC(new Date(oldestNote).getUTCFullYear(), 0, 1);
	return { start, newest, oldestNote };
});
const thetaOf = (time: number) => ((time - span.value.start) / YEAR) * Math.PI * 2;
const years = computed(() => {
	const first = new Date(span.value.start).getUTCFullYear();
	const last = new Date(span.value.newest).getUTCFullYear();
	return Array.from({ length: last - first + 1 }, (_, i) => first + i);
});

// Each year of record is this much scroll.
const PX_PER_YEAR = 900;
const scrollLength = computed(() => ((span.value.newest - span.value.oldestNote) / YEAR) * PX_PER_YEAR + 200);

/* ─── State the template reads ─── */

const needleTime = ref(Date.now());
const hover = ref<Note | null>(null);
const glReady = ref(false);
const playing = computed(() => now.playing.value);

/** What's under the needle: the present, or the nearest piece of work. */
const underNeedle = computed(() => {
	const t = needleTime.value;
	const list = notes.value;
	if (!list.length || t > list[0]!.time + 20 * DAY) return { type: "now" as const };
	let nearest = list[0]!;
	for (const note of list) if (Math.abs(note.time - t) < Math.abs(nearest.time - t)) nearest = note;
	return { type: "note" as const, note: nearest };
});

/* ─── DOM ─── */

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const yearEls = ref<HTMLElement[]>([]);
const geometry = { cx: 0, cy: 0, radius: 300, r0: 50, b: 10, rotation: 0, width: 1280, height: 800 };
const centre = reactive({ x: 0, y: 0 });

const timeToScroll = (time: number) => {
	const fraction = clamp((span.value.newest - time) / (span.value.newest - span.value.oldestNote || 1), 0, 1);
	return (root.value?.offsetTop ?? 0) + fraction * (scrollLength.value - 200);
};
const seek = (note: Note) => scrollTo({ top: timeToScroll(note.time), behavior: prefersReducedMotion() ? "auto" : "smooth" });

const notePosition = (note: Note) => {
	const theta = thetaOf(note.time);
	const r = geometry.r0 + geometry.b * theta;
	const angle = theta + geometry.rotation;
	return { x: geometry.cx + Math.cos(angle) * r, y: geometry.cy + Math.sin(angle) * r };
};

/* ─── Pointer: hover a mark to name it; drag the record to scrub it, like a hand on vinyl ─── */

let drag: { angle: number; scroll: number } | null = null;
const cursor = ref("default");

const localPoint = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY });
const noteAt = (x: number, y: number) => {
	let best: Note | null = null;
	let bestDistance = 12;
	for (const note of notes.value) {
		const p = notePosition(note);
		const d = Math.hypot(p.x - x, p.y - y);
		if (d < bestDistance) {
			best = note;
			bestDistance = d;
		}
	}
	return best;
};

const onPointerMove = (event: PointerEvent) => {
	const { x, y } = localPoint(event);
	if (drag) {
		const angle = Math.atan2(y - geometry.cy, x - geometry.cx);
		let delta = angle - drag.angle;
		if (delta > Math.PI) delta -= Math.PI * 2;
		if (delta < -Math.PI) delta += Math.PI * 2;
		drag.angle = angle;
		// Turning the record clockwise moves the needle back in time, the same way scrolling down does.
		drag.scroll += (delta / (Math.PI * 2)) * PX_PER_YEAR;
		scrollTo({ top: drag.scroll });
		return;
	}
	hover.value = noteAt(x, y);
	const onRecord = Math.hypot(x - geometry.cx, y - geometry.cy) < geometry.radius;
	cursor.value = hover.value ? "pointer" : onRecord ? "grab" : "default";
};
const onPointerDown = (event: PointerEvent) => {
	const { x, y } = localPoint(event);
	const note = noteAt(x, y);
	if (note) {
		seek(note);
		return;
	}
	if (Math.hypot(x - geometry.cx, y - geometry.cy) > geometry.radius) return;
	drag = { angle: Math.atan2(y - geometry.cy, x - geometry.cx), scroll: scrollY };
	cursor.value = "grabbing";
	(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
};
const onPointerUp = () => {
	drag = null;
	cursor.value = "grab";
};

/* ─── Shader ─── */

const RECORD_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 color;

uniform vec2 u_view;
uniform float u_dpr;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_r0;
uniform float u_b;
uniform float u_rotation;
uniform float u_thetaEnd;     // the present
uniform float u_song;         // how much groove the current song has cut, in radians
uniform float u_needle;       // theta under the needle
uniform float u_needleAngle;
uniform float u_notes[${MAX_NOTES}];
uniform float u_kinds[${MAX_NOTES}];
uniform float u_hits[${MAX_NOTES}];
uniform int u_count;
uniform vec3 u_bg;
uniform vec3 u_fg;
uniform vec3 u_muted;
uniform vec3 u_faint;
uniform float u_time;
uniform float u_playing;
uniform float u_night;

const float TAU = 6.28318530718;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float stroke(float d, float halfWidth) { return clamp(halfWidth * u_dpr + 0.5 - d * u_dpr, 0.0, 1.0); }

float segment(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p - a, ba = b - a;
	return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

void main() {
	vec2 p = vec2(gl_FragCoord.x, u_view.y * u_dpr - gl_FragCoord.y) / u_dpr;
	vec2 d = p - u_center;
	float r = length(d);
	float local = mod(atan(d.y, d.x) - u_rotation, TAU);

	// Nearest turn of an Archimedean spiral: r = r0 + b * theta, so the turn index falls out of a division.
	float turn = floor((r - u_r0 - u_b * local) / (TAU * u_b) + 0.5);
	float theta = local + turn * TAU;
	float end = u_thetaEnd + u_song;

	// Near the needle the groove trembles while I'm listening to something.
	float nearNeedle = exp(-pow((theta - u_needle) / 1.1, 2.0));
	float wobble = u_playing * sin(theta * 160.0 - u_time * 24.0) * 0.8 * exp(-pow((theta - u_needle) / 0.5, 2.0));
	float groove = abs(r - (u_r0 + u_b * theta) - wobble);
	float inRecord = step(0.0, theta) * step(theta, end);

	vec3 col = u_bg;
	// Late at night in Lagos the room is lit only around the needle.
	float light = mix(1.0, 0.18 + 0.82 * nearNeedle, u_night);
	float isSong = step(u_thetaEnd, theta);
	vec3 grooveColor = mix(u_muted, u_fg, max(nearNeedle * 0.85, isSong));
	float grooveAlpha = stroke(groove, mix(0.42, 0.9, isSong)) * inRecord * mix(0.55, 1.0, max(nearNeedle, isSong)) * light;
	col = mix(col, grooveColor, grooveAlpha);

	// The label in the middle and the edge of the disc.
	col = mix(col, u_faint, stroke(abs(r - u_r0 * 0.82), 0.5) * light);
	col = mix(col, u_faint, stroke(abs(r - u_radius), 0.4) * 0.6);

	// Marks in the groove: projects are solid, writing is an open ring. A struck mark sends out one ring.
	for (int i = 0; i < ${MAX_NOTES}; i++) {
		if (i >= u_count) break;
		float t = u_notes[i];
		float rr = u_r0 + u_b * t;
		float a = t + u_rotation;
		float dist = length(p - u_center - rr * vec2(cos(a), sin(a)));
		float solid = u_kinds[i];
		float lit = mix(0.55, 1.0, exp(-pow((t - u_needle) / 0.6, 2.0))) * mix(1.0, 0.25 + 0.75 * exp(-pow((t - u_needle) / 1.1, 2.0)), u_night);
		float mark = mix(stroke(abs(dist - 3.6), 0.55), stroke(dist - 3.4, 0.0) , solid);
		col = mix(col, u_fg, clamp(mark, 0.0, 1.0) * lit);
		float h = u_hits[i];
		if (h < 1.0) col = mix(col, u_fg, stroke(abs(dist - 4.0 - h * 46.0), 0.5) * (1.0 - h) * 0.8);
	}

	// A straight rail, and the needle riding on it.
	vec2 dir = vec2(cos(u_needleAngle), sin(u_needleAngle));
	col = mix(col, u_faint, stroke(segment(p, u_center + dir * u_r0, u_center + dir * (u_radius + 70.0)), 0.4) * 0.7);
	float rn = u_r0 + u_b * u_needle;
	vec2 tip = u_center + dir * rn;
	vec2 across = vec2(-dir.y, dir.x);
	col = mix(col, u_fg, stroke(segment(p, tip - across * 9.0, tip + across * 9.0), 0.7));
	col = mix(col, u_fg, stroke(segment(p, tip, u_center + dir * (u_radius + 70.0)), 0.55));

	col += (hash(gl_FragCoord.xy + fract(u_time) * 57.0) - 0.5) * 0.016;
	color = vec4(col, 1.0);
}`;

onMounted(() => {
	const reduce = prefersReducedMotion();
	let palette: Palette = readPalette();
	const stopPalette = watchPalette((next) => (palette = next));

	const hits = new Float32Array(MAX_NOTES).fill(1);
	const thetas = new Float32Array(MAX_NOTES);
	const kinds = new Float32Array(MAX_NOTES);
	let night = 0;
	let wobble = 0;
	let previous = needleTime.value;

	const layoutRecord = () => {
		const width = innerWidth;
		const height = innerHeight;
		const wide = width >= 900;
		geometry.width = width;
		geometry.height = height;
		geometry.radius = wide ? Math.min(width * 0.31, height * 0.42) : Math.min(width * 0.44, height * 0.3);
		geometry.cx = wide ? width * 0.64 : width * 0.5;
		geometry.cy = wide ? height * 0.52 : height * 0.33;
		centre.x = geometry.cx;
		centre.y = geometry.cy;
		const thetaEnd = thetaOf(span.value.newest);
		geometry.r0 = geometry.radius * 0.17;
		geometry.b = (geometry.radius * 0.95 - geometry.r0) / Math.max(Math.PI, thetaEnd + 0.6);
	};
	layoutRecord();

	const gl = canvas.value ? createGL(canvas.value) : null;
	let render: ((time: number) => void) | null = null;
	if (gl) {
		try {
			const program = createProgram(gl, FULLSCREEN_VS, RECORD_FS);
			const triangle = createFullscreenTriangle(gl);
			const u = program.uniforms;
			render = (time) => {
				fitCanvas(canvas.value!);
				program.use();
				bindTarget(gl, null);
				gl.uniform2f(u.u_view!, geometry.width, geometry.height);
				gl.uniform1f(u.u_dpr!, gl.drawingBufferWidth / geometry.width);
				gl.uniform2f(u.u_center!, geometry.cx, geometry.cy);
				gl.uniform1f(u.u_radius!, geometry.radius);
				gl.uniform1f(u.u_r0!, geometry.r0);
				gl.uniform1f(u.u_b!, geometry.b);
				gl.uniform1f(u.u_rotation!, geometry.rotation);
				gl.uniform1f(u.u_thetaEnd!, thetaOf(span.value.newest));
				gl.uniform1f(u.u_song!, now.track.value ? 0.08 + now.progress.value * 0.5 : 0);
				gl.uniform1f(u.u_needle!, thetaOf(needleTime.value));
				gl.uniform1f(u.u_needleAngle!, NEEDLE_ANGLE);
				gl.uniform1fv(u.u_notes!, thetas);
				gl.uniform1fv(u.u_kinds!, kinds);
				gl.uniform1fv(u.u_hits!, hits);
				gl.uniform1i(u.u_count!, notes.value.length);
				gl.uniform3fv(u.u_bg!, palette.bg);
				gl.uniform3fv(u.u_fg!, palette.fg);
				gl.uniform3fv(u.u_muted!, palette.muted);
				gl.uniform3fv(u.u_faint!, palette.faint);
				gl.uniform1f(u.u_time!, time);
				gl.uniform1f(u.u_playing!, wobble);
				gl.uniform1f(u.u_night!, night);
				triangle();
			};
			glReady.value = true;
		} catch (error) {
			console.error(error);
		}
	}

	const stop = startLoop((time, delta) => {
		const list = notes.value;
		list.forEach((note, i) => {
			thetas[i] = thetaOf(note.time);
			kinds[i] = note.kind === "project" ? 1 : 0;
		});

		// Scroll position is the needle's place in time.
		const offset = clamp(scrollY - (root.value?.offsetTop ?? 0), 0, scrollLength.value - 200);
		const target = span.value.newest - (offset / (scrollLength.value - 200 || 1)) * (span.value.newest - span.value.oldestNote);
		needleTime.value = reduce ? target : damp(needleTime.value, target, 10, delta);

		// Rotate the disc so the needle's moment sits under the rail.
		geometry.rotation = NEEDLE_ANGLE - thetaOf(needleTime.value);

		// Any mark the needle passes rings once, pitched on the harmonic series: newer work sits higher up it.
		const low = Math.min(previous, needleTime.value);
		const high = Math.max(previous, needleTime.value);
		list.forEach((note, i) => {
			if (note.time > low && note.time <= high && high - low < YEAR) {
				hits[i] = 0;
				if (soundOn.value) {
					const position = (note.time - span.value.oldestNote) / (span.value.newest - span.value.oldestNote || 1);
					const harmonic = 2 + Math.round(position * 10);
					bell({ frequency: 98 * harmonic * (note.kind === "writing" ? 1.5 : 1), velocity: 0.45, pan: note.kind === "writing" ? -0.3 : 0.3 });
				}
			}
			hits[i] = Math.min(1, hits[i]! + delta / 1.4);
		});
		previous = needleTime.value;

		night = damp(night, now.lateNight.value ? 1 : 0, 1.5, delta);
		wobble = damp(wobble, playing.value && !reduce ? 1 : 0, 2, delta);

		// Year numbers ride the record at the start of each turn.
		yearEls.value.forEach((el, i) => {
			const year = years.value[i];
			if (!el || year === undefined) return;
			const theta = thetaOf(Date.UTC(year, 0, 1));
			const r = geometry.r0 + geometry.b * theta - geometry.b * 0.5;
			const angle = theta + geometry.rotation;
			el.style.transform = `translate3d(${geometry.cx + Math.cos(angle) * r}px, ${geometry.cy + Math.sin(angle) * r}px, 0) translate(-50%, -50%) rotate(${angle + Math.PI / 2}rad)`;
		});

		render?.(time);
	});

	addEventListener("resize", layoutRecord);
	onUnmounted(() => {
		stop();
		stopPalette();
		removeEventListener("resize", layoutRecord);
		gl?.getExtension("WEBGL_lose_context")?.loseContext();
	});
});

const hoverStyle = computed(() => {
	if (!hover.value) return {};
	const p = notePosition(hover.value);
	return { transform: `translate3d(${p.x + 14}px, ${p.y - 10}px, 0)` };
});
</script>

<template>
	<div ref="root" class="score" :style="{ height: `calc(100svh + ${scrollLength}px)` }">
		<canvas
			ref="canvas"
			class="score__canvas"
			:style="{ cursor }"
			aria-hidden="true"
			@pointermove="onPointerMove"
			@pointerdown="onPointerDown"
			@pointerup="onPointerUp"
			@pointercancel="onPointerUp"
			@pointerleave="hover = null"
		/>
		<div v-if="!glReady" class="score__fallback" aria-hidden="true" />

		<div class="score__years" aria-hidden="true">
			<span v-for="year in years" :key="year" ref="yearEls" class="score__year mono">{{ year }}</span>
		</div>
		<div v-show="centre.x > 0" class="score__label" aria-hidden="true" :style="{ left: `${centre.x}px`, top: `${centre.y}px` }">
			<span lang="ja">{{ profile.ganbaru.word }}</span>
		</div>
		<p v-if="hover" class="score__hover mono" :style="hoverStyle" aria-hidden="true">{{ hover.title }}</p>

		<aside class="sleeve">
			<header class="sleeve__head">
				<p class="mono muted">{{ profile.kicker }}</p>
				<h1 class="sleeve__name">
					{{ profile.name.first }} <em>{{ profile.name.last }}</em>
				</h1>
			</header>

			<div class="needle" aria-live="polite">
				<Transition name="needle" mode="out-in">
					<div v-if="underNeedle.type === 'now'" key="now" class="needle__card">
						<p class="needle__lede">{{ profile.lede }} {{ profile.aside }}</p>
						<NowLine class="needle__now" />
						<p class="mono muted needle__hint">scroll, or turn the record, to play it back through the years</p>
					</div>
					<div v-else :key="underNeedle.note.key" class="needle__card">
						<p class="mono muted">{{ underNeedle.note.side }}{{ underNeedle.note.number }} · {{ underNeedle.note.kind }}</p>
						<NuxtLink
							:to="underNeedle.note.href"
							:external="underNeedle.note.external"
							:target="underNeedle.note.external ? '_blank' : undefined"
							:rel="underNeedle.note.external ? 'noopener noreferrer' : undefined"
							class="needle__title"
							>{{ underNeedle.note.title }}</NuxtLink
						>
						<p class="needle__detail">{{ underNeedle.note.detail }}</p>
						<p class="mono muted">{{ underNeedle.note.meta }}</p>
					</div>
				</Transition>
			</div>

			<details class="tracklist">
				<summary class="mono">tracklist · {{ notes.length }}</summary>
				<div class="tracklist__sides">
					<section v-for="(side, name) in sides" :key="name">
						<h2 class="mono muted">side {{ name }} · {{ name === "A" ? "writing" : "projects" }}</h2>
						<ol>
							<li v-for="note in side" :key="note.key">
								<NuxtLink
									:to="note.href"
									:external="note.external"
									:target="note.external ? '_blank' : undefined"
									:rel="note.external ? 'noopener noreferrer' : undefined"
									class="tracklist__track"
									@focus="seek(note)"
									@mouseenter="hover = note"
									@mouseleave="hover = null"
								>
									<span class="mono muted">{{ name }}{{ note.number }}</span>
									<span>{{ note.title }}</span>
									<span class="mono muted">{{ formatMonthYear(new Date(note.time).toISOString()) }}</span>
								</NuxtLink>
							</li>
						</ol>
					</section>
				</div>
			</details>

			<footer class="sleeve__foot">
				<p class="sleeve__contact">
					Write to me at <a :href="`mailto:${profile.email}`">{{ profile.email }}</a
					>, or find me on
					<template v-for="(link, i) in profile.links" :key="link.href"
						><a :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.label }}</a
						>{{ i === profile.links.length - 2 ? " and " : i < profile.links.length - 1 ? ", " : "." }}</template
					>
				</p>
				<RoomSound />
			</footer>
		</aside>
	</div>
</template>

<style scoped>
.score {
	position: relative;
}
.score__canvas {
	position: fixed;
	inset: 0;
	width: 100%;
	height: 100%;
	touch-action: pan-y;
}
.score__fallback {
	position: fixed;
	right: 8vw;
	top: 50%;
	width: min(60vh, 40vw);
	aspect-ratio: 1;
	transform: translateY(-50%);
	border-radius: 50%;
	background: repeating-radial-gradient(circle, transparent 0 14px, var(--rule) 14px 15px);
}
.score__years {
	position: fixed;
	inset: 0;
	pointer-events: none;
}
.score__year {
	position: absolute;
	top: 0;
	left: 0;
	color: var(--faint);
	font-size: 0.625rem;
	will-change: transform;
}
.score__label {
	position: fixed;
	transform: translate(-50%, -50%);
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-size: clamp(0.8rem, 1.4vw, 1.05rem);
	writing-mode: vertical-rl;
	letter-spacing: 0.1em;
	color: var(--muted);
	pointer-events: none;
}
.score__hover {
	position: fixed;
	top: 0;
	left: 0;
	padding: 0.2rem 0.45rem;
	background: var(--bg);
	border: 1px solid var(--rule);
	pointer-events: none;
	white-space: nowrap;
}

.sleeve {
	position: fixed;
	z-index: 2;
	top: 0;
	bottom: 0;
	left: 0;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	width: min(30rem, 34vw);
	padding: 1.75rem var(--gutter) 1.5rem;
	pointer-events: none;
}
.sleeve > * {
	pointer-events: auto;
}
.sleeve__name {
	margin-top: 0.75rem;
	font-weight: 300;
	font-size: clamp(2.25rem, 4.6vw, 4.25rem);
	line-height: 0.92;
	letter-spacing: -0.035em;
}
.sleeve__name em {
	display: block;
	font-weight: 250;
}

.needle {
	flex: 1;
	display: flex;
	align-items: center;
	min-height: 12rem;
}
.needle__card {
	display: grid;
	gap: 0.6rem;
	max-width: 26rem;
}
.needle__lede {
	font-size: clamp(1rem, 1.3vw, 1.15rem);
	line-height: 1.5;
	text-wrap: pretty;
}
.needle__now {
	font-size: 1rem;
}
.needle__hint {
	margin-top: 0.5rem;
}
.needle__title {
	font-size: clamp(1.75rem, 2.8vw, 2.5rem);
	font-weight: 300;
	line-height: 1.1;
	letter-spacing: -0.02em;
	font-style: italic;
}
.needle__detail {
	color: var(--muted);
	line-height: 1.45;
	text-wrap: pretty;
}
.needle-enter-active,
.needle-leave-active {
	transition:
		opacity 260ms ease,
		transform 360ms var(--ease-out);
}
.needle-enter-from {
	opacity: 0;
	transform: translateY(6px);
}
.needle-leave-to {
	opacity: 0;
}

.tracklist summary {
	cursor: pointer;
	color: var(--muted);
	list-style: none;
}
.tracklist summary::before {
	content: "+ ";
}
.tracklist[open] summary::before {
	content: "– ";
}
.tracklist__sides {
	display: grid;
	gap: 1rem;
	max-height: 34vh;
	overflow-y: auto;
	margin-top: 0.75rem;
	padding-right: 0.5rem;
}
.tracklist__sides h2 {
	font-weight: 400;
	margin-bottom: 0.25rem;
}
.tracklist__track {
	display: grid;
	grid-template-columns: 2rem 1fr auto;
	gap: 0.75rem;
	align-items: baseline;
	padding-block: 0.3rem;
	border-bottom: 1px solid var(--rule);
	font-size: 0.95rem;
}
.tracklist__track:hover span:nth-child(2) {
	font-style: italic;
}

.sleeve__foot {
	display: grid;
	gap: 0.5rem;
}
.sleeve__contact {
	color: var(--muted);
	font-size: 0.95rem;
	line-height: 1.45;
}
.sleeve__contact a {
	color: var(--fg);
	font-style: italic;
	overflow-wrap: anywhere;
}

@media (max-width: 899px) {
	.sleeve {
		top: auto;
		width: 100%;
		max-height: 60svh;
		padding-top: 0;
		gap: 0.9rem;
		background: linear-gradient(to bottom, transparent, var(--bg) 2.5rem);
		padding-top: 2.5rem;
	}
	.sleeve__head {
		display: none;
	}
	.needle {
		flex: none;
		min-height: 9rem;
		align-items: flex-end;
	}
	.tracklist__sides {
		max-height: 24vh;
	}
}
</style>
