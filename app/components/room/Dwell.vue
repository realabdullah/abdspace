<script setup lang="ts">
import type { RoomContent } from "~/composables/useRoomContent";
import {
	FULLSCREEN_VS,
	bindTarget,
	bindTexture,
	clamp,
	createDoubleTarget,
	createFullscreenTriangle,
	createGL,
	createProgram,
	createTarget,
	deleteTarget,
	prefersReducedMotion,
	readPalette,
	startLoop,
	watchPalette,
	type DoubleTarget,
	type Palette,
	type Target,
} from "~/lib/gl";

/*
 * 留: to stay, to stop and remain. The page is set in real, selectable text, then drawn again through a
 * fluid simulation. Moving stirs it; stillness lets it settle back into type. Rest on a title and what's
 * beneath it surfaces out of the ink. Skimming gets you noise. Staying gets you the detail.
 * Nothing here makes a sound: quiet is the point of this room.
 */

const props = defineProps<{ content: RoomContent }>();

interface Entry {
	key: string;
	title: string;
	detail: string;
	meta: string;
	href: string;
	external: boolean;
}

const projects = computed<Entry[]>(() =>
	props.content.projects.map((project) => ({
		key: `p:${project.link}`,
		title: project.title,
		detail: project.about,
		meta: `${formatMonthYear(project.date)} · ${hostOf(project.link)}`,
		href: project.link,
		external: true,
	}))
);
const writings = computed<Entry[]>(() =>
	props.content.writings.map((post) => ({
		key: `w:${post.slug}`,
		title: post.title,
		detail: post.description,
		meta: `${formatMonthYear(post.createdAt)} · ${post.readTime} min`,
		href: `/writings/${post.slug}`,
		external: false,
	}))
);

const live = ref(false);
const revealed = reactive(new Set<string>());
const reveal = (key: string) => revealed.add(key);
const shown = (key: string) => !live.value || revealed.has(key);

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const ring = ref<HTMLElement | null>(null);

/* ─── Shaders: a small stable-fluids solver, plus one field that remembers how far each pixel has been carried ─── */

const head = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 color;
uniform vec2 u_texel;
`;

const ADVECT_FS = `${head}
uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform float u_dt;
uniform float u_keep;
void main() {
	vec2 back = v_uv - u_dt * texture(u_velocity, v_uv).xy * u_texel;
	color = u_keep * texture(u_source, back);
}`;

const SPLAT_FS = `${head}
uniform sampler2D u_target;
uniform vec2 u_point;
uniform vec2 u_force;
uniform float u_radius;
uniform float u_aspect;
void main() {
	vec2 p = (v_uv - u_point) * vec2(u_aspect, 1.0);
	color = texture(u_target, v_uv) + vec4(u_force * exp(-dot(p, p) / u_radius), 0.0, 0.0);
}`;

// Scrolling drags the whole field, unevenly across columns, so fast skimming streaks the text.
const DRAG_FS = `${head}
uniform sampler2D u_target;
uniform float u_amount;
uniform float u_time;
void main() {
	float lanes = 0.55 + 0.45 * sin(v_uv.x * 23.0 + u_time * 0.7) * sin(v_uv.x * 7.0 - u_time * 0.3);
	color = texture(u_target, v_uv) + vec4(0.0, u_amount * lanes, 0.0, 0.0);
}`;

const CURL_FS = `${head}
uniform sampler2D u_velocity;
void main() {
	float l = texture(u_velocity, v_uv - vec2(u_texel.x, 0.0)).y;
	float r = texture(u_velocity, v_uv + vec2(u_texel.x, 0.0)).y;
	float b = texture(u_velocity, v_uv - vec2(0.0, u_texel.y)).x;
	float t = texture(u_velocity, v_uv + vec2(0.0, u_texel.y)).x;
	color = vec4(0.5 * (r - l - t + b), 0.0, 0.0, 1.0);
}`;

const VORTICITY_FS = `${head}
uniform sampler2D u_velocity;
uniform sampler2D u_curl;
uniform float u_strength;
uniform float u_dt;
void main() {
	float l = texture(u_curl, v_uv - vec2(u_texel.x, 0.0)).x;
	float r = texture(u_curl, v_uv + vec2(u_texel.x, 0.0)).x;
	float b = texture(u_curl, v_uv - vec2(0.0, u_texel.y)).x;
	float t = texture(u_curl, v_uv + vec2(0.0, u_texel.y)).x;
	float c = texture(u_curl, v_uv).x;
	vec2 force = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
	force = force / (length(force) + 1e-4) * u_strength * c * vec2(1.0, -1.0);
	color = vec4(texture(u_velocity, v_uv).xy + force * u_dt, 0.0, 1.0);
}`;

const DIVERGENCE_FS = `${head}
uniform sampler2D u_velocity;
void main() {
	vec2 c = texture(u_velocity, v_uv).xy;
	float l = v_uv.x - u_texel.x < 0.0 ? -c.x : texture(u_velocity, v_uv - vec2(u_texel.x, 0.0)).x;
	float r = v_uv.x + u_texel.x > 1.0 ? -c.x : texture(u_velocity, v_uv + vec2(u_texel.x, 0.0)).x;
	float b = v_uv.y - u_texel.y < 0.0 ? -c.y : texture(u_velocity, v_uv - vec2(0.0, u_texel.y)).y;
	float t = v_uv.y + u_texel.y > 1.0 ? -c.y : texture(u_velocity, v_uv + vec2(0.0, u_texel.y)).y;
	color = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}`;

const PRESSURE_FS = `${head}
uniform sampler2D u_pressure;
uniform sampler2D u_divergence;
void main() {
	float l = texture(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
	float r = texture(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
	float b = texture(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
	float t = texture(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
	color = vec4((l + r + b + t - texture(u_divergence, v_uv).x) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT_FS = `${head}
uniform sampler2D u_pressure;
uniform sampler2D u_velocity;
void main() {
	float l = texture(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
	float r = texture(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
	float b = texture(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
	float t = texture(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
	color = vec4(texture(u_velocity, v_uv).xy - 0.5 * vec2(r - l, t - b), 0.0, 1.0);
}`;

// Where each pixel's text has been carried from. Advected like dye, then relaxed back toward zero: settling.
const CARRY_FS = `${head}
uniform sampler2D u_velocity;
uniform sampler2D u_carry;
uniform vec2 u_velocityTexel;
uniform float u_dt;
uniform float u_settle;
void main() {
	vec2 v = texture(u_velocity, v_uv).xy * u_velocityTexel;
	vec2 d = texture(u_carry, v_uv - v * u_dt).xy - v * u_dt;
	d *= u_settle;
	color = vec4(clamp(d, vec2(-0.3), vec2(0.3)), 0.0, 1.0);
}`;

const SCREEN_FS = `${head}
uniform sampler2D u_ink;
uniform sampler2D u_carry;
uniform vec3 u_bg;
uniform float u_time;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
	vec2 d = texture(u_carry, v_uv).xy;
	// A few taps along the carry: at rest they coincide and the type is sharp; in motion they smear like wet ink.
	vec4 ink = vec4(0.0);
	for (int i = 0; i < 5; i++) ink += texture(u_ink, v_uv + d * (1.0 - float(i) * 0.16));
	ink /= 5.0;
	vec3 col = u_bg * (1.0 - ink.a) + ink.rgb;
	col += (hash(gl_FragCoord.xy + fract(u_time) * 31.0) - 0.5) * 0.014;
	color = vec4(col, 1.0);
}`;

/* ─── Ink: the DOM's own words, measured once and drawn into a canvas ─── */

interface Word {
	text: string;
	x: number;
	y: number; // baseline, page coordinates
	width: number;
	font: string;
	color: string;
	spacing: string;
	group: string | null;
	underline: boolean;
}

const measureWords = (container: HTMLElement, ctx: CanvasRenderingContext2D): Word[] => {
	const words: Word[] = [];
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
	const range = document.createRange();
	for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
		const el = node.parentElement;
		if (!el || el.closest("[data-no-ink]")) continue;
		const style = getComputedStyle(el);
		if (style.visibility === "hidden" || style.display === "none") continue;
		const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
		ctx.font = font;
		const group = el.closest<HTMLElement>("[data-group]")?.dataset.group ?? null;
		const underline = Boolean(el.closest("a.ink-underline"));
		for (const match of node.data.matchAll(/\S+/g)) {
			range.setStart(node, match.index);
			range.setEnd(node, match.index + match[0].length);
			const rect = range.getClientRects()[0];
			if (!rect || rect.width === 0) continue;
			const metrics = ctx.measureText(match[0]);
			const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
			const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
			const baseline = rect.top + (rect.height - (ascent + descent)) / 2 + ascent;
			words.push({ text: match[0], x: rect.left + scrollX, y: baseline + scrollY, width: rect.width, font, color: style.color, spacing: style.letterSpacing, group, underline });
		}
	}
	return words;
};

onMounted(async () => {
	if (prefersReducedMotion() || !canvas.value || !root.value) return;
	const gl = createGL(canvas.value, { alpha: false });
	if (!gl || !gl.getExtension("EXT_color_buffer_float")) return;
	gl.getExtension("OES_texture_float_linear");

	let palette: Palette = readPalette();
	let layoutDirty = true;
	let inkDirty = true;
	const stopPalette = watchPalette((next) => {
		palette = next;
		layoutDirty = true;
	});

	let programs: Record<string, ReturnType<typeof createProgram>>;
	try {
		programs = {
			advect: createProgram(gl, FULLSCREEN_VS, ADVECT_FS),
			splat: createProgram(gl, FULLSCREEN_VS, SPLAT_FS),
			drag: createProgram(gl, FULLSCREEN_VS, DRAG_FS),
			curl: createProgram(gl, FULLSCREEN_VS, CURL_FS),
			vorticity: createProgram(gl, FULLSCREEN_VS, VORTICITY_FS),
			divergence: createProgram(gl, FULLSCREEN_VS, DIVERGENCE_FS),
			pressure: createProgram(gl, FULLSCREEN_VS, PRESSURE_FS),
			gradient: createProgram(gl, FULLSCREEN_VS, GRADIENT_FS),
			carry: createProgram(gl, FULLSCREEN_VS, CARRY_FS),
			screen: createProgram(gl, FULLSCREEN_VS, SCREEN_FS),
		};
	} catch (error) {
		console.error(error);
		return;
	}
	const triangle = createFullscreenTriangle(gl);

	const inkCanvas = document.createElement("canvas");
	const ink = inkCanvas.getContext("2d")!;
	const inkTexture = gl.createTexture()!;
	gl.bindTexture(gl.TEXTURE_2D, inkTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	let velocity: DoubleTarget;
	let pressure: DoubleTarget;
	let carry: DoubleTarget;
	let divergence: Target;
	let curl: Target;
	let sim = { w: 1, h: 1 };
	let carrySize = { w: 1, h: 1 };
	let dpr = 1;
	let cssWidth = 1;
	let cssHeight = 1;

	const allocate = () => {
		dpr = Math.min(devicePixelRatio || 1, 2);
		cssWidth = innerWidth;
		cssHeight = innerHeight;
		canvas.value!.width = Math.round(cssWidth * dpr);
		canvas.value!.height = Math.round(cssHeight * dpr);
		inkCanvas.width = canvas.value!.width;
		inkCanvas.height = canvas.value!.height;
		const aspect = cssWidth / cssHeight;
		sim = { w: Math.round(128 * Math.max(1, aspect)), h: Math.round(128 * Math.max(1, 1 / aspect)) };
		carrySize = { w: sim.w * 3, h: sim.h * 3 };
		const rg = { internalFormat: gl.RG16F, format: gl.RG, type: gl.HALF_FLOAT };
		const r = { internalFormat: gl.R16F, format: gl.RED, type: gl.HALF_FLOAT };
		velocity = createDoubleTarget(gl, sim.w, sim.h, rg);
		pressure = createDoubleTarget(gl, sim.w, sim.h, r);
		divergence = createTarget(gl, sim.w, sim.h, r);
		curl = createTarget(gl, sim.w, sim.h, r);
		carry = createDoubleTarget(gl, carrySize.w, carrySize.h, rg);
		layoutDirty = true;
	};
	const release = () => {
		for (const target of [velocity?.read, velocity?.write, pressure?.read, pressure?.write, carry?.read, carry?.write, divergence, curl]) if (target) deleteTarget(gl, target);
	};
	allocate();

	/* Ink */

	let words: Word[] = [];
	const revealAlpha = new Map<string, number>();

	const drawInk = () => {
		ink.setTransform(dpr, 0, 0, dpr, 0, 0);
		ink.clearRect(0, 0, cssWidth, cssHeight);
		ink.textBaseline = "alphabetic";
		const top = scrollY;
		for (const word of words) {
			const y = word.y - top;
			if (y < -80 || y > cssHeight + 80) continue;
			const alpha = word.group ? (revealAlpha.get(word.group) ?? 0) : 1;
			if (alpha <= 0.001) continue;
			ink.globalAlpha = alpha;
			ink.font = word.font;
			ink.fillStyle = word.color;
			if ("letterSpacing" in ink) (ink as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = word.spacing === "normal" ? "0px" : word.spacing;
			ink.fillText(word.text, word.x - scrollX, y);
			if (word.underline) ink.fillRect(word.x - scrollX, y + 3, word.width, 1);
		}
		ink.globalAlpha = 1;
		gl.bindTexture(gl.TEXTURE_2D, inkTexture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, inkCanvas);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
	};

	/* Fluid passes */

	const pass = (program: ReturnType<typeof createProgram>, target: Target, texel: { w: number; h: number }, set: (u: Record<string, WebGLUniformLocation>) => void) => {
		program.use();
		bindTarget(gl, target);
		gl.uniform2f(program.uniforms.u_texel!, 1 / texel.w, 1 / texel.h);
		set(program.uniforms);
		triangle();
	};

	const splat = (x: number, y: number, fx: number, fy: number, radius = 0.0016) => {
		pass(programs.splat!, velocity.write, sim, (u) => {
			gl.uniform1i(u.u_target!, bindTexture(gl, 0, velocity.read.texture));
			gl.uniform2f(u.u_point!, x / cssWidth, 1 - y / cssHeight);
			gl.uniform2f(u.u_force!, fx, fy);
			gl.uniform1f(u.u_radius!, radius);
			gl.uniform1f(u.u_aspect!, cssWidth / cssHeight);
		});
		velocity.swap();
	};

	const stepFluid = (dt: number, time: number, scrollDelta: number) => {
		if (Math.abs(scrollDelta) > 0.5) {
			pass(programs.drag!, velocity.write, sim, (u) => {
				gl.uniform1i(u.u_target!, bindTexture(gl, 0, velocity.read.texture));
				// Scrolling down moves the text up; the ink lags behind it and catches up.
				gl.uniform1f(u.u_amount!, clamp(-scrollDelta * (sim.h / cssHeight) * 9, -220, 220));
				gl.uniform1f(u.u_time!, time);
			});
			velocity.swap();
		}

		pass(programs.curl!, curl, sim, (u) => gl.uniform1i(u.u_velocity!, bindTexture(gl, 0, velocity.read.texture)));
		pass(programs.vorticity!, velocity.write, sim, (u) => {
			gl.uniform1i(u.u_velocity!, bindTexture(gl, 0, velocity.read.texture));
			gl.uniform1i(u.u_curl!, bindTexture(gl, 1, curl.texture));
			gl.uniform1f(u.u_strength!, 22);
			gl.uniform1f(u.u_dt!, dt);
		});
		velocity.swap();

		pass(programs.divergence!, divergence, sim, (u) => gl.uniform1i(u.u_velocity!, bindTexture(gl, 0, velocity.read.texture)));
		for (let i = 0; i < 18; i++) {
			pass(programs.pressure!, pressure.write, sim, (u) => {
				gl.uniform1i(u.u_pressure!, bindTexture(gl, 0, pressure.read.texture));
				gl.uniform1i(u.u_divergence!, bindTexture(gl, 1, divergence.texture));
			});
			pressure.swap();
		}
		pass(programs.gradient!, velocity.write, sim, (u) => {
			gl.uniform1i(u.u_pressure!, bindTexture(gl, 0, pressure.read.texture));
			gl.uniform1i(u.u_velocity!, bindTexture(gl, 1, velocity.read.texture));
		});
		velocity.swap();

		pass(programs.advect!, velocity.write, sim, (u) => {
			gl.uniform1i(u.u_velocity!, bindTexture(gl, 0, velocity.read.texture));
			gl.uniform1i(u.u_source!, bindTexture(gl, 1, velocity.read.texture));
			gl.uniform1f(u.u_dt!, dt);
			gl.uniform1f(u.u_keep!, Math.exp(-dt * 1.6));
		});
		velocity.swap();

		pass(programs.carry!, carry.write, carrySize, (u) => {
			gl.uniform1i(u.u_velocity!, bindTexture(gl, 0, velocity.read.texture));
			gl.uniform1i(u.u_carry!, bindTexture(gl, 1, carry.read.texture));
			gl.uniform2f(u.u_velocityTexel!, 1 / sim.w, 1 / sim.h);
			gl.uniform1f(u.u_dt!, dt);
			// Settling: about two thirds of the way home every half second.
			gl.uniform1f(u.u_settle!, Math.exp(-dt * 2.3));
		});
		carry.swap();
	};

	/* Pointer and dwelling */

	const pointer = { x: -1, y: -1, lastX: -1, lastY: -1, stillSince: performance.now(), moved: false };
	const DWELL_MS = 650;

	const onMove = (event: PointerEvent) => {
		pointer.x = event.clientX;
		pointer.y = event.clientY;
		if (Math.hypot(pointer.x - pointer.lastX, pointer.y - pointer.lastY) > 3) pointer.stillSince = performance.now();
		pointer.moved = true;
	};
	addEventListener("pointermove", onMove, { passive: true });

	const resizeObserver = new ResizeObserver(() => (layoutDirty = true));
	resizeObserver.observe(root.value);
	const mutationObserver = new MutationObserver(() => (layoutDirty = true));
	mutationObserver.observe(root.value, { subtree: true, characterData: true, childList: true });
	const onResize = () => {
		release();
		allocate();
	};
	addEventListener("resize", onResize);
	await document.fonts.ready;
	document.fonts.addEventListener("loadingdone", () => (layoutDirty = true));

	live.value = true;
	await nextTick();

	let lastScroll = scrollY;
	const stop = startLoop((time, delta) => {
		const dt = Math.max(delta, 1 / 240);
		if (layoutDirty) {
			layoutDirty = false;
			words = measureWords(root.value!, ink);
			inkDirty = true;
		}

		// Moving stirs the ink in the direction you moved.
		if (pointer.moved && pointer.lastX >= 0) {
			const dx = pointer.x - pointer.lastX;
			const dy = pointer.y - pointer.lastY;
			if (dx || dy) splat(pointer.x, pointer.y, dx * (sim.w / cssWidth) * 26, -dy * (sim.h / cssHeight) * 26);
		}
		pointer.moved = false;
		pointer.lastX = pointer.x;
		pointer.lastY = pointer.y;

		// Staying still over a title for long enough brings up what's under it.
		const held = performance.now() - pointer.stillSince;
		const under = pointer.x >= 0 ? document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLElement>("[data-dwell]") : null;
		const key = under?.dataset.dwell;
		const progress = key && !revealed.has(key) ? clamp(held / DWELL_MS, 0, 1) : 0;
		if (ring.value) {
			ring.value.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
			ring.value.style.setProperty("--dwell", String(progress));
		}
		if (key && progress >= 1) {
			reveal(key);
			// Surfacing is a small upwelling of the fluid where the detail sits.
			const rect = under!.getBoundingClientRect();
			const cx = rect.left + Math.min(rect.width, 420) / 2;
			const cy = rect.bottom + 24;
			splat(cx - 40, cy, 160, 0, 0.004);
			splat(cx + 40, cy, -160, 0, 0.004);
		}

		for (const group of revealed) {
			const current = revealAlpha.get(group) ?? 0;
			if (current < 1) {
				revealAlpha.set(group, Math.min(1, current + delta / 0.9));
				inkDirty = true;
			}
		}
		for (const group of revealAlpha.keys()) {
			if (revealed.has(group)) continue;
			revealAlpha.delete(group);
			inkDirty = true;
		}

		const scrollDelta = scrollY - lastScroll;
		lastScroll = scrollY;
		if (scrollDelta !== 0) inkDirty = true;
		if (inkDirty) {
			inkDirty = false;
			drawInk();
		}

		stepFluid(dt, time, scrollDelta);

		const screen = programs.screen!;
		screen.use();
		bindTarget(gl, null);
		gl.uniform2f(screen.uniforms.u_texel!, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
		gl.uniform1i(screen.uniforms.u_ink!, bindTexture(gl, 0, inkTexture));
		gl.uniform1i(screen.uniforms.u_carry!, bindTexture(gl, 1, carry.read.texture));
		gl.uniform3fv(screen.uniforms.u_bg!, palette.bg);
		gl.uniform1f(screen.uniforms.u_time!, time);
		triangle();
	});

	onUnmounted(() => {
		stop();
		stopPalette();
		resizeObserver.disconnect();
		mutationObserver.disconnect();
		removeEventListener("pointermove", onMove);
		removeEventListener("resize", onResize);
		release();
		gl.getExtension("WEBGL_lose_context")?.loseContext();
	});
});
</script>

<template>
	<div class="dwell" :class="{ 'is-live': live }">
		<canvas v-show="live" ref="canvas" class="dwell__canvas" aria-hidden="true" />
		<div v-show="live" ref="ring" class="dwell__ring" aria-hidden="true" data-no-ink><i /></div>

		<div ref="root" class="dwell__page">
			<header class="block intro">
				<p class="mono muted">{{ profile.kicker }}</p>
				<h1 class="intro__name">
					{{ profile.name.first }} <em>{{ profile.name.last }}</em>
				</h1>
				<p class="intro__lede">{{ profile.lede }} {{ profile.aside }}</p>
				<NowLine class="intro__now" />
			</header>

			<section v-for="list in [{ id: 'projects', label: 'side projects', entries: projects }, { id: 'writing', label: 'writing', entries: writings }]" :key="list.id" class="block">
				<h2 class="mono muted block__label">{{ list.label }} · {{ list.entries.length }}</h2>
				<ul class="entries" :class="`entries--${list.id}`">
					<li v-for="entry in list.entries" :key="entry.key" class="entry">
						<button type="button" class="entry__title" :data-dwell="entry.key" :aria-expanded="shown(entry.key)" :aria-controls="`detail-${entry.key}`" @click="reveal(entry.key)" @focus="reveal(entry.key)">
							{{ entry.title }}
						</button>
						<div :id="`detail-${entry.key}`" class="entry__detail" :data-group="entry.key" :class="{ 'is-shown': shown(entry.key) }">
							<p>{{ entry.detail }}</p>
							<p class="mono muted">
								{{ entry.meta }} ·
								<NuxtLink :to="entry.href" :external="entry.external" :target="entry.external ? '_blank' : undefined" :rel="entry.external ? 'noopener noreferrer' : undefined" class="ink-underline">{{
									entry.external ? "visit ↗" : "read →"
								}}</NuxtLink>
							</p>
						</div>
					</li>
				</ul>
			</section>

			<section class="block">
				<h2 class="mono muted block__label">contact</h2>
				<p class="contact">
					Write to me at <a :href="`mailto:${profile.email}`" class="ink-underline">{{ profile.email }}</a
					>, or find me on
					<template v-for="(link, i) in profile.links" :key="link.href"
						><a :href="link.href" target="_blank" rel="noopener noreferrer" class="ink-underline">{{ link.label }}</a
						>{{ i === profile.links.length - 2 ? " and " : i < profile.links.length - 1 ? ", " : "." }}</template
					>
				</p>
			</section>

			<footer class="block coda">
				<p lang="ja" class="coda__word">留</p>
				<p class="mono muted">tome: to stay, to stop and remain. <span lang="ja">{{ profile.ganbaru.word }}</span>, {{ profile.ganbaru.gloss }}.</p>
			</footer>
		</div>

		<p class="hint mono" data-no-ink>
			<span>move and it stirs · keep still and it settles · rest on a title to read what’s under it</span>
		</p>
	</div>
</template>

<style scoped>
.dwell {
	position: relative;
}
.dwell__canvas {
	position: fixed;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
}
/* The words stay in the page, selectable and read aloud; only their paint moves to the canvas. */
.dwell.is-live .dwell__page,
.dwell.is-live .dwell__page :deep(*) {
	-webkit-text-fill-color: transparent;
}
.dwell.is-live .dwell__page ::selection {
	-webkit-text-fill-color: var(--bg);
}

.dwell__ring {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 5;
	width: 0;
	height: 0;
	pointer-events: none;
}
.dwell__ring i {
	position: absolute;
	left: -11px;
	top: -11px;
	width: 22px;
	height: 22px;
	border-radius: 50%;
	background: conic-gradient(var(--fg) calc(var(--dwell, 0) * 360deg), transparent 0);
	mask: radial-gradient(circle, transparent 9.5px, #000 10px);
	opacity: calc(var(--dwell, 0) * 4);
}
@media (hover: none) {
	.dwell__ring {
		display: none;
	}
}

.dwell__page {
	position: relative;
	max-width: 64rem;
	padding: clamp(5rem, 14vh, 9rem) var(--gutter) 6rem;
}
.block {
	padding-block: clamp(3.5rem, 9vw, 7rem);
}
.block__label {
	font-weight: 400;
	margin-bottom: 1.5rem;
}
.intro {
	padding-top: 0;
}
.intro__name {
	margin-top: 1.5rem;
	font-weight: 300;
	font-size: clamp(3.25rem, 11vw, 9.5rem);
	line-height: 0.9;
	letter-spacing: -0.04em;
}
.intro__name em {
	display: block;
	font-weight: 250;
}
.intro__lede {
	max-width: 34rem;
	margin-top: 2.5rem;
	font-size: clamp(1.15rem, 1.8vw, 1.4rem);
	line-height: 1.5;
	text-wrap: pretty;
}
.intro__now {
	margin-top: 2rem;
}

.entries {
	display: grid;
	gap: 0.25rem;
}
.entry__title {
	display: block;
	text-align: left;
	font-weight: 300;
	font-size: clamp(2rem, 5.6vw, 4.5rem);
	line-height: 1.02;
	letter-spacing: -0.03em;
	padding-block: 0.1em;
}
.entries--writing .entry__title {
	font-style: italic;
}
/* The detail always holds its space: an empty line under each title, waiting. */
.entry__detail {
	display: grid;
	gap: 0.35rem;
	max-width: 36rem;
	min-height: 4.75rem;
	padding: 0.35rem 0 1.5rem 0.2rem;
	color: var(--muted);
	font-size: 1.05rem;
	line-height: 1.45;
}
/* Once something has surfaced it stays: reading leaves a trace. Until then its link can't be hit by accident. */
.dwell.is-live .entry__detail:not(.is-shown) {
	pointer-events: none;
}
.dwell:not(.is-live) .entry__detail {
	min-height: 0;
}
.ink-underline {
	background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 100% 1px;
}
.dwell.is-live .ink-underline {
	background: none;
}

.contact {
	max-width: 46rem;
	font-weight: 300;
	font-size: clamp(1.75rem, 4vw, 2.75rem);
	line-height: 1.22;
	letter-spacing: -0.015em;
	text-wrap: pretty;
}
.contact a {
	font-style: italic;
	overflow-wrap: anywhere;
}
.coda__word {
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-weight: 800;
	font-size: clamp(4rem, 12vw, 8rem);
	line-height: 1;
	margin-bottom: 1rem;
}

.hint {
	position: fixed;
	left: var(--gutter);
	right: var(--gutter);
	bottom: 1.1rem;
	color: var(--muted);
	pointer-events: none;
}
.hint span {
	padding: 0.15rem 0.4rem;
	background: var(--bg);
}
</style>
