<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import type { RoomContent } from "~/composables/useRoomContent";
import { pluck } from "~/lib/audio";
import {
	FULLSCREEN_VS,
	bindTarget,
	bindTexture,
	clamp,
	createDoubleTarget,
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
 * 張る: to stretch something taut. The whole site is one line under tension.
 * Work hangs from it in time order, newest first, spaced by the time between things.
 * Those gaps are also the tuning: pluck between two projects and the note is set by
 * the length of string between them, so the rhythm of the work is literally the instrument.
 */

const props = defineProps<{ content: RoomContent }>();
const { playing, lateNight, track } = useNowPlaying();
const { enabled: soundOn } = useRoomSound();

interface Hang {
	key: string;
	lane: "below" | "above";
	title: string;
	detail: string;
	meta: string;
	href: string;
	external: boolean;
	time: number;
	x: number;
	drop: number;
	mass: number;
}

const DAY = 86_400_000;
const DX = 4; // px of world per simulated point
const SUBSTEPS = 6;

const viewport = reactive({ width: 1280, height: 800 });
const layout = computed(() => {
	const { width: vw } = viewport;
	const pad = Math.max(20, vw * 0.06);
	const introWidth = Math.min(620, vw - pad * 2);
	const anchorLeft = pad;
	const firstX = anchorLeft + introWidth + Math.min(200, vw * 0.18);
	const minGap = Math.min(300, vw * 0.74);

	const raw = [
		...props.content.projects.map((project) => ({
			key: `p:${project.link}`,
			lane: "below" as const,
			title: project.title,
			detail: project.about,
			meta: hostOf(project.link),
			href: project.link,
			external: true,
			time: Date.parse(project.date),
			featured: project.featured,
		})),
		...props.content.writings.map((post) => ({
			key: `w:${post.slug}`,
			lane: "above" as const,
			title: post.title,
			detail: post.description,
			meta: `${formatMonthYear(post.createdAt)} · ${post.readTime} min`,
			href: `/writings/${post.slug}`,
			external: false,
			time: Date.parse(post.createdAt),
			featured: true,
		})),
	].sort((a, b) => b.time - a.time);

	const newest = raw[0]?.time ?? Date.now();
	const oldest = raw.at(-1)?.time ?? newest;
	const span = Math.max(DAY, newest - oldest);

	// Time sets the spacing; each lane then pushes apart just enough to stay readable, carrying the push forward so later gaps keep their proportions.
	let shift = 0;
	const lastX = { below: -Infinity, above: -Infinity };
	const items: Hang[] = raw.map((item) => {
		let x = firstX + ((newest - item.time) / DAY) * 1.4 + shift;
		const floor = lastX[item.lane] + minGap;
		if (x < floor) {
			shift += floor - x;
			x = floor;
		}
		lastX[item.lane] = x;
		const age = (newest - item.time) / span;
		return {
			...item,
			x,
			// Older work hangs lower on a longer thread, and is heavier on the line.
			drop: 34 + age * 110 + (item.featured ? 0 : 18),
			mass: 2.2 + age * 2.5,
		};
	});

	const lastItem = Math.max(firstX, lastX.below, lastX.above);
	const contactWidth = Math.min(560, vw - pad * 2);
	const contactX = lastItem + minGap + 40;
	const anchorRight = contactX + contactWidth;
	return { pad, introWidth, anchorLeft, anchorRight, contactX, contactWidth, items, length: anchorRight + pad };
});

const baseY = computed(() => Math.round(viewport.height * 0.56));
const trackHeight = computed(() => Math.max(viewport.height, layout.value.length - viewport.width + viewport.height));

/* ─── DOM refs ─── */

const root = ref<HTMLElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const world = ref<HTMLElement | null>(null);
const readout = ref<HTMLElement | null>(null);
const tagEls = new Map<string, HTMLElement>();
const setTag = (key: string) => (el: Element | ComponentPublicInstance | null) => {
	const node = el && "$el" in el ? el.$el : el;
	if (node instanceof HTMLElement) tagEls.set(key, node);
	else tagEls.delete(key);
};

const glReady = ref(false);
const when = ref("");
const cursor = ref<"default" | "grab" | "grabbing">("default");

/* ─── Simulation state ─── */

let u = new Float32Array(0); // displacement, px
let v = new Float32Array(0); // velocity
let mass = new Float32Array(0);
let hold = new Float32Array(0); // a soft spring back to rest where each tag hangs
let iLeft = 0;
let iRight = 0;
let tension = 0.8;
const sway = new Map<string, { y: number; vy: number; angle: number; spin: number }>();

const rebuild = () => {
	const { length, anchorLeft, anchorRight, items } = layout.value;
	const n = Math.ceil(length / DX) + 2;
	u = new Float32Array(n);
	v = new Float32Array(n);
	mass = new Float32Array(n).fill(1);
	hold = new Float32Array(n);
	iLeft = Math.round(anchorLeft / DX);
	iRight = Math.min(n - 1, Math.round(anchorRight / DX));
	// Each tag is a weight on the line and a loose point of support. That partly divides the line into separate strings, which is what makes the pitch model hold.
	for (const item of items) {
		const i = Math.round(item.x / DX);
		for (let d = -1; d <= 1; d++) {
			if (i + d <= iLeft || i + d >= iRight) continue;
			mass[i + d] = d === 0 ? item.mass : 1 + (item.mass - 1) * 0.4;
			hold[i + d] = d === 0 ? 0.06 : 0.02;
		}
		if (!sway.has(item.key)) sway.set(item.key, { y: 0, vy: 0, angle: 0, spin: 0 });
	}
};

const sample = (worldX: number) => {
	const f = worldX / DX;
	const i = Math.floor(f);
	if (i < 0 || i + 1 >= u.length) return 0;
	const t = f - i;
	return u[i]! * (1 - t) + u[i + 1]! * t;
};

/** The note between the two neighbouring tags: shorter string, higher pitch; plucking near an end is brighter. */
const tone = (worldX: number) => {
	const { items, anchorLeft, anchorRight } = layout.value;
	let left = anchorLeft;
	let right = anchorRight;
	for (const item of items) {
		if (item.x <= worldX && item.x > left) left = item.x;
		if (item.x > worldX && item.x < right) right = item.x;
	}
	const segment = Math.max(40, right - left);
	const along = (worldX - left) / segment;
	const frequency = clamp((82 * 1600) / segment, 82, 1046) * Math.sqrt(tension / 0.8);
	return { frequency, segment, brightness: 1 - 2 * Math.min(along, 1 - along) };
};

/* ─── Pointer: crossing the line catches it, it slips past a limit and rings ─── */

const pointer = { x: 0, y: 0, inside: false, lastRel: Number.NaN, id: -1 };
let grab: { index: number; button: boolean } | null = null;
let travel = 0;
let readoutTimer: ReturnType<typeof setTimeout> | undefined;

const showReadout = (worldX: number, frequency: number, segment: number) => {
	const el = readout.value;
	if (!el) return;
	el.textContent = `${Math.round(frequency)} Hz · ${Math.round(segment)} px of string`;
	el.style.transform = `translate3d(${worldX - travel}px, ${baseY.value + 26}px, 0)`;
	el.classList.add("is-on");
	clearTimeout(readoutTimer);
	readoutTimer = setTimeout(() => el.classList.remove("is-on"), 1400);
};

const release = (strength: number) => {
	if (!grab) return;
	const worldX = grab.index * DX;
	grab = null;
	cursor.value = "default";
	const { frequency, segment, brightness } = tone(worldX);
	showReadout(worldX, frequency, segment);
	if (soundOn.value) pluck({ frequency, velocity: clamp(strength, 0.15, 1), brightness, pan: ((worldX - travel) / viewport.width) * 2 - 1 });
};

/** A gentle, hands-free pluck: used when a tag gets keyboard focus. */
const strike = (worldX: number, amount = 26) => {
	const i = Math.round(worldX / DX);
	if (i <= iLeft || i >= iRight) return;
	for (let d = -6; d <= 6; d++) if (i + d > iLeft && i + d < iRight) u[i + d]! += amount * Math.exp(-(d * d) / 12);
	const { frequency, segment, brightness } = tone(worldX);
	showReadout(worldX, frequency, segment);
	if (soundOn.value) pluck({ frequency, velocity: 0.35, brightness, pan: ((worldX - travel) / viewport.width) * 2 - 1 });
};

const toLocal = (event: PointerEvent) => {
	const rect = stage.value!.getBoundingClientRect();
	pointer.x = event.clientX - rect.left;
	pointer.y = event.clientY - rect.top;
};

const onPointerMove = (event: PointerEvent) => {
	toLocal(event);
	pointer.inside = true;
};
const onPointerDown = (event: PointerEvent) => {
	toLocal(event);
	pointer.inside = true;
	const worldX = travel + pointer.x;
	const i = Math.round(worldX / DX);
	if (i <= iLeft || i >= iRight) return;
	const rel = pointer.y - (baseY.value + sample(worldX));
	if (Math.abs(rel) < (event.pointerType === "touch" ? 28 : 16)) {
		grab = { index: i, button: true };
		pointer.id = event.pointerId;
		stage.value?.setPointerCapture(event.pointerId);
		cursor.value = "grabbing";
		event.preventDefault();
	}
};
const onPointerUp = (event: PointerEvent) => {
	if (grab?.button && event.pointerId === pointer.id) {
		const pulled = Math.abs(u[grab.index] ?? 0);
		release(pulled / 140);
	}
};
const onPointerLeave = () => {
	pointer.inside = false;
	pointer.lastRel = Number.NaN;
	if (grab && !grab.button) release(0.3);
};

const reachTag = (item: Hang) => {
	// Focus moves along the line, so the line moves to it.
	const target = clamp(item.x - viewport.width * 0.45, 0, layout.value.length - viewport.width);
	const top = (root.value?.offsetTop ?? 0) + target;
	if (Math.abs(scrollY - top) > 4) scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
	strike(item.x, 18);
};

/* ─── Rendering ─── */

const shared = /* glsl */ `
uniform sampler2D u_disp;
uniform vec2 u_view;      // css px
uniform float u_dpr;
uniform float u_base;     // css px from the top
uniform vec2 u_anchors;   // anchor x positions on screen, css px

float lineY(float x) { return u_base + texture(u_disp, vec2(clamp(x / u_view.x, 0.0, 1.0), 0.5)).r; }

// Distance to the curve, corrected for slope so the line keeps its weight while it bends.
float lineDistance(vec2 p) {
	float y = lineY(p.x);
	float slope = (lineY(p.x + 1.5) - lineY(p.x - 1.5)) / 3.0;
	float inside = step(u_anchors.x, p.x) * step(p.x, u_anchors.y);
	return mix(1e4, abs(p.y - y) / sqrt(1.0 + slope * slope), inside);
}
vec2 cssCoord() { return vec2(gl_FragCoord.x, u_view.y * u_dpr - gl_FragCoord.y) / u_dpr; }
`;

// A long exposure: the line leaves a fading record of where it has been, so a ringing string draws its own envelope.
const TRAIL_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 color;
uniform sampler2D u_prev;
uniform float u_shift;
uniform float u_decay;
uniform float u_floor;
${shared}
void main() {
	float past = texture(u_prev, v_uv + vec2(u_shift, 0.0)).r * u_decay - u_floor;
	float d = lineDistance(cssCoord());
	float now = exp(-d * d * 0.35) * 0.55;
	color = vec4(max(past, now), 0.0, 0.0, 1.0);
}`;

const SCREEN_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 color;
uniform sampler2D u_trail;
uniform vec3 u_bg;
uniform vec3 u_fg;
uniform vec3 u_faint;
uniform float u_weight;
uniform float u_time;
${shared}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
	vec2 p = cssCoord();
	vec3 col = u_bg;
	float trail = clamp(texture(u_trail, v_uv).r, 0.0, 1.0);
	col = mix(col, u_faint, trail * 0.7);

	float d = lineDistance(p) * u_dpr;
	float line = clamp(u_weight * u_dpr + 0.5 - d, 0.0, 1.0);
	col = mix(col, u_fg, line);

	// The two anchors the tension is held between.
	for (int i = 0; i < 2; i++) {
		float ax = i == 0 ? u_anchors.x : u_anchors.y;
		float r = length(p - vec2(ax, u_base));
		col = mix(col, u_fg, clamp(1.0 - abs(r - 4.0) * u_dpr * 0.8, 0.0, 1.0));
	}

	col += (hash(gl_FragCoord.xy + fract(u_time) * 91.0) - 0.5) * 0.018;
	color = vec4(col, 1.0);
}`;

const TEX_WIDTH = 1024;

onMounted(() => {
	const reduce = prefersReducedMotion();
	const measure = () => {
		viewport.width = stage.value?.clientWidth ?? innerWidth;
		viewport.height = stage.value?.clientHeight ?? innerHeight;
	};
	measure();
	rebuild();

	let palette: Palette = readPalette();
	const stopPalette = watchPalette((next) => (palette = next));

	const gl = canvas.value ? createGL(canvas.value) : null;
	let draw: ((time: number, shift: number) => void) | null = null;
	let disposeGL = () => {};

	if (gl) {
		try {
			const floatTargets = Boolean(gl.getExtension("EXT_color_buffer_float"));
			const targetFormat = floatTargets ? {} : { internalFormat: gl.RGBA8, type: gl.UNSIGNED_BYTE };
			const triangle = createFullscreenTriangle(gl);
			const trailProgram = createProgram(gl, FULLSCREEN_VS, TRAIL_FS);
			const screenProgram = createProgram(gl, FULLSCREEN_VS, SCREEN_FS);

			const disp = gl.createTexture()!;
			gl.bindTexture(gl.TEXTURE_2D, disp);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, TEX_WIDTH, 1, 0, gl.RED, gl.FLOAT, null);
			const slice = new Float32Array(TEX_WIDTH);

			fitCanvas(canvas.value!);
			let trail = createDoubleTarget(gl, gl.drawingBufferWidth, gl.drawingBufferHeight, targetFormat);

			const setShared = (uniforms: Record<string, WebGLUniformLocation>) => {
				const dpr = gl.drawingBufferWidth / viewport.width;
				gl.uniform2f(uniforms.u_view!, viewport.width, viewport.height);
				gl.uniform1f(uniforms.u_dpr!, dpr);
				gl.uniform1f(uniforms.u_base!, baseY.value);
				gl.uniform2f(uniforms.u_anchors!, layout.value.anchorLeft - travel, layout.value.anchorRight - travel);
				gl.uniform1i(uniforms.u_disp!, bindTexture(gl, 0, disp));
			};

			draw = (time, shift) => {
				if (fitCanvas(canvas.value!)) trail = createDoubleTarget(gl, gl.drawingBufferWidth, gl.drawingBufferHeight, targetFormat);

				// Only what's on screen goes to the GPU, resampled to a fixed width.
				for (let j = 0; j < TEX_WIDTH; j++) slice[j] = sample(travel + (j / (TEX_WIDTH - 1)) * viewport.width);
				gl.bindTexture(gl.TEXTURE_2D, disp);
				gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TEX_WIDTH, 1, gl.RED, gl.FLOAT, slice);

				trailProgram.use();
				bindTarget(gl, trail.write);
				setShared(trailProgram.uniforms);
				gl.uniform1i(trailProgram.uniforms.u_prev!, bindTexture(gl, 1, trail.read.texture));
				gl.uniform1f(trailProgram.uniforms.u_shift!, shift / viewport.width);
				gl.uniform1f(trailProgram.uniforms.u_decay!, 0.965);
				gl.uniform1f(trailProgram.uniforms.u_floor!, floatTargets ? 0.0008 : 0.004);
				triangle();
				trail.swap();

				screenProgram.use();
				bindTarget(gl, null);
				setShared(screenProgram.uniforms);
				gl.uniform1i(screenProgram.uniforms.u_trail!, bindTexture(gl, 1, trail.read.texture));
				gl.uniform3fv(screenProgram.uniforms.u_bg!, palette.bg);
				gl.uniform3fv(screenProgram.uniforms.u_fg!, palette.fg);
				gl.uniform3fv(screenProgram.uniforms.u_faint!, palette.faint);
				// Taut reads as a fine line; slack as a softer, heavier one.
				gl.uniform1f(screenProgram.uniforms.u_weight!, 0.5 + (1 - tension) * 0.9);
				gl.uniform1f(screenProgram.uniforms.u_time!, time);
				triangle();
			};
			disposeGL = () => gl.getExtension("WEBGL_lose_context")?.loseContext();
			glReady.value = true;
		} catch (error) {
			console.error(error);
		}
	}

	const step = (time: number, delta: number) => {
		// Scroll is converted into travel along the line, eased slightly so it feels like moving a camera rather than a page.
		const offset = (root.value?.getBoundingClientRect().top ?? 0) * -1;
		const target = clamp(offset, 0, Math.max(0, layout.value.length - viewport.width));
		const before = travel;
		travel = reduce ? target : damp(travel, target, 14, delta);
		const shift = travel - before;
		if (world.value) world.value.style.transform = `translate3d(${-travel}px, 0, 0)`;

		// My state sets the tension: playing pulls it tight; late at night in Lagos it goes slack.
		const wanted = playing.value ? 1 : lateNight.value ? 0.5 : 0.78;
		tension = damp(tension, wanted, 0.6, delta);
		const k = 0.85 * tension;
		const loss = lateNight.value ? 0.0012 : 0.0022;

		// Crossing the line catches it.
		let near = false;
		if (pointer.inside && !reduce) {
			const worldX = travel + pointer.x;
			const i = Math.round(worldX / DX);
			if (i > iLeft && i < iRight) {
				const rel = pointer.y - (baseY.value + (u[i] ?? 0));
				near = Math.abs(rel) < 16;
				if (!grab && !Number.isNaN(pointer.lastRel) && Math.sign(rel) !== Math.sign(pointer.lastRel) && Math.abs(rel - pointer.lastRel) < 220) {
					grab = { index: i, button: false };
				}
				pointer.lastRel = rel;
				if (grab) grab.index = clamp(i, iLeft + 1, iRight - 1);
			} else if (grab && !grab.button) {
				release(0.3);
			}
		}

		if (grab) {
			const pull = pointer.y - baseY.value;
			// A finger slips off sooner than a held grip; slack string stretches further before it lets go.
			const limit = (grab.button ? 170 : 46) * (1.6 - tension * 0.6);
			if (Math.abs(pull) > limit) release(Math.abs(pull) / limit);
		}
		cursor.value = grab ? "grabbing" : near ? "grab" : "default";

		if (!reduce) {
			if (playing.value) u[iLeft + 2]! += Math.sin(time * Math.PI * 2 * 1.6) * 0.18;
			for (let s = 0; s < SUBSTEPS; s++) {
				if (grab) {
					const pull = pointer.y - baseY.value;
					u[grab.index] = pull;
					v[grab.index] = 0;
				}
				for (let i = iLeft + 1; i < iRight; i++) {
					const force = k * (u[i - 1]! + u[i + 1]! - 2 * u[i]!) - hold[i]! * u[i]!;
					v[i] = (v[i]! + force / mass[i]!) * (1 - loss);
				}
				for (let i = iLeft + 1; i < iRight; i++) u[i]! += v[i]!;
			}
		}

		// Each tag follows its point on the line a beat late, and tilts with the slope as a wave runs under it.
		const min = travel - 400;
		const max = travel + viewport.width + 400;
		for (const item of layout.value.items) {
			const el = tagEls.get(item.key);
			const state = sway.get(item.key);
			if (!el || !state || item.x < min || item.x > max) continue;
			const at = sample(item.x);
			const slope = (sample(item.x + DX * 2) - sample(item.x - DX * 2)) / (DX * 4);
			state.vy += (240 * (at - state.y) - 16 * state.vy) * delta;
			state.y += state.vy * delta;
			state.spin += (70 * (Math.atan(slope) * 0.9 - state.angle) - 2.2 * state.spin) * delta;
			state.angle += state.spin * delta;
			el.style.transform = `translate3d(${item.x}px, ${baseY.value + state.y}px, 0) rotate(${state.angle}rad)`;
		}

		draw?.(time, shift);
	};

	// The time under your eye: the date of the tag nearest the middle of the screen.
	const updateWhen = () => {
		const centre = travel + viewport.width / 2;
		const { items } = layout.value;
		if (!items.length || centre < (items[0]?.x ?? 0) - viewport.width * 0.4) {
			when.value = "now";
			return;
		}
		let nearest = items[0]!;
		for (const item of items) if (Math.abs(item.x - centre) < Math.abs(nearest.x - centre)) nearest = item;
		when.value = formatMonthYear(new Date(nearest.time).toISOString()).toLowerCase();
	};
	const whenTimer = setInterval(updateWhen, 250);

	const stop = startLoop(step);
	const onResize = () => {
		measure();
		rebuild();
	};
	addEventListener("resize", onResize);

	onUnmounted(() => {
		stop();
		stopPalette();
		clearInterval(whenTimer);
		clearTimeout(readoutTimer);
		removeEventListener("resize", onResize);
		disposeGL();
	});
});
</script>

<template>
	<div ref="root" class="tension" :style="{ height: `${trackHeight}px` }">
		<div
			ref="stage"
			class="tension__stage"
			:data-cursor="cursor"
			@pointermove="onPointerMove"
			@pointerdown="onPointerDown"
			@pointerup="onPointerUp"
			@pointercancel="onPointerLeave"
			@pointerleave="onPointerLeave"
		>
			<canvas ref="canvas" class="tension__canvas" aria-hidden="true" />
			<div v-if="!glReady" class="tension__fallback" :style="{ top: `${baseY}px`, left: `${layout.anchorLeft}px` }" aria-hidden="true" />
			<!-- A band along the line where touch plucks instead of scrolling. -->
			<div class="tension__hit" :style="{ top: `${baseY - 28}px` }" aria-hidden="true" />

			<div ref="world" class="tension__world">
				<header class="intro" :style="{ left: `${layout.anchorLeft}px`, width: `${layout.introWidth}px`, bottom: `${viewport.height - baseY + 28}px` }">
					<p class="mono muted">{{ profile.kicker }}</p>
					<h1 class="intro__name">
						{{ profile.name.first }} <em>{{ profile.name.last }}</em>
					</h1>
					<p class="intro__lede">{{ profile.lede }} {{ profile.aside }}</p>
				</header>

				<div class="anchor" :style="{ transform: `translate3d(${layout.anchorLeft}px, ${baseY}px, 0)` }">
					<p class="anchor__note mono muted"><span lang="ja">張</span> ba: to stretch, to pull tight, to hold out</p>
					<NowLine class="anchor__now" />
				</div>

				<NuxtLink
					v-for="item in layout.items"
					:key="item.key"
					:ref="setTag(item.key)"
					class="tag"
					:class="`tag--${item.lane}`"
					:to="item.href"
					:external="item.external"
					:target="item.external ? '_blank' : undefined"
					:rel="item.external ? 'noopener noreferrer' : undefined"
					:style="{ '--drop': `${item.drop}px`, transform: `translate3d(${item.x}px, ${baseY}px, 0)` }"
					@focus="reachTag(item)"
				>
					<span class="tag__thread" aria-hidden="true" />
					<span class="tag__body">
						<span class="tag__meta mono">{{ item.lane === "above" ? "writing" : formatMonthYear(new Date(item.time).toISOString()) }}</span>
						<span class="tag__title">{{ item.title }}</span>
						<span class="tag__detail">{{ item.detail }}</span>
						<span class="tag__meta mono">{{ item.meta }}<template v-if="item.external"> ↗</template></span>
					</span>
				</NuxtLink>

				<section class="contact" :style="{ left: `${layout.contactX}px`, width: `${layout.contactWidth}px`, bottom: `${viewport.height - baseY + 28}px` }">
					<p class="mono muted">contact</p>
					<p class="contact__text">
						Write to me at <a :href="`mailto:${profile.email}`">{{ profile.email }}</a
						>, or find me on
						<template v-for="(link, i) in profile.links" :key="link.href"
							><a :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.label }}</a
							>{{ i === profile.links.length - 2 ? " and " : i < profile.links.length - 1 ? ", " : "." }}</template
						>
					</p>
				</section>
			</div>

			<p ref="readout" class="readout mono" aria-hidden="true" />

			<footer class="hud mono">
				<span class="hud__when">{{ when }}</span>
				<span class="hud__hint muted">scroll to travel · cross the line to pluck it<template v-if="track"> · tuned to what I’m playing</template></span>
				<RoomSound />
			</footer>
		</div>
	</div>
</template>

<style scoped>
.tension {
	position: relative;
}
.tension__stage {
	position: sticky;
	top: 0;
	height: 100svh;
	overflow: hidden;
	touch-action: pan-y;
	user-select: none;
}
.tension__stage[data-cursor="grab"] {
	cursor: grab;
}
.tension__stage[data-cursor="grabbing"] {
	cursor: grabbing;
}
.tension__canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
.tension__fallback {
	position: absolute;
	right: 0;
	height: 1px;
	background: var(--fg);
}
.tension__hit {
	position: absolute;
	left: 0;
	right: 0;
	height: 56px;
	touch-action: none;
}
.tension__world {
	position: absolute;
	inset: 0;
	will-change: transform;
	pointer-events: none;
}
.tension__world a,
.tension__world :deep(a) {
	pointer-events: auto;
}

.intro {
	position: absolute;
	display: grid;
	gap: 1.25rem;
}
.intro__name {
	font-weight: 300;
	font-size: clamp(2.75rem, 7.5vw, 6.5rem);
	line-height: 0.92;
	letter-spacing: -0.035em;
}
.intro__name em {
	display: block;
	font-weight: 250;
}
.intro__lede {
	max-width: 32rem;
	font-size: clamp(1rem, 1.4vw, 1.1875rem);
	line-height: 1.5;
	text-wrap: pretty;
}

.anchor {
	position: absolute;
	top: 0;
	left: 0;
	width: min(34rem, 84vw);
	padding-top: 1.5rem;
	pointer-events: auto;
}
.anchor__note [lang="ja"] {
	color: var(--fg);
}
.anchor__now {
	margin-top: 0.75rem;
	font-size: 1rem;
}

/* A tag hangs from a single point on the line. Its box is that point, so rotation swings it from there. */
.tag {
	position: absolute;
	top: 0;
	left: 0;
	width: 0;
	height: 0;
	will-change: transform;
}
.tag__thread {
	position: absolute;
	left: 0;
	width: 1px;
	height: var(--drop);
	background: var(--faint);
	transition: background-color 300ms ease;
}
.tag__body {
	position: absolute;
	left: -0.3rem;
	display: grid;
	gap: 0.3rem;
	width: min(15rem, 66vw);
	padding: 0.65rem 0.3rem;
}
.tag--below .tag__thread {
	top: 0;
}
.tag--below .tag__body {
	top: var(--drop);
}
.tag--above .tag__thread {
	bottom: 0;
}
.tag--above .tag__body {
	bottom: var(--drop);
}
.tag__title {
	font-size: 1.375rem;
	line-height: 1.2;
	letter-spacing: -0.01em;
}
.tag--above .tag__title {
	font-style: italic;
}
.tag__detail {
	color: var(--muted);
	font-size: 0.95rem;
	line-height: 1.4;
	text-wrap: pretty;
}
.tag__meta {
	color: var(--muted);
}
.tag:hover .tag__thread,
.tag:focus-visible .tag__thread {
	background: var(--fg);
}
.tag:hover .tag__title {
	font-style: italic;
}
.tag:focus-visible {
	outline: none;
}
.tag:focus-visible .tag__body {
	outline: 1px solid var(--fg);
	outline-offset: 2px;
}

.contact {
	position: absolute;
	display: grid;
	gap: 1rem;
}
.contact__text {
	font-weight: 300;
	font-size: clamp(1.5rem, 3vw, 2.25rem);
	line-height: 1.25;
	letter-spacing: -0.015em;
	text-wrap: pretty;
}
.contact__text a {
	font-style: italic;
	background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 100% 1px;
	overflow-wrap: anywhere;
}

.readout {
	position: absolute;
	top: 0;
	left: 0;
	color: var(--muted);
	opacity: 0;
	transition: opacity 500ms ease;
	white-space: nowrap;
	pointer-events: none;
}
.readout.is-on {
	opacity: 1;
	transition-duration: 80ms;
}

.hud {
	position: absolute;
	left: var(--gutter);
	right: var(--gutter);
	bottom: 1.25rem;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5rem 1.5rem;
}
.hud__when {
	min-width: 5rem;
	color: var(--fg);
}
.hud__hint {
	flex: 1;
}
@media (max-width: 40rem) {
	.hud__hint {
		display: none;
	}
	.hud {
		justify-content: space-between;
	}
}
</style>
