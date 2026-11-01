<script setup lang="ts">
import type { RoomContent } from "~/composables/useRoomContent";
import { FULLSCREEN_VS, bindTarget, bindTexture, clamp, createFullscreenTriangle, createGL, createProgram, damp, fitCanvas, prefersReducedMotion, readPalette, startLoop, watchPalette, type Palette } from "~/lib/gl";
import { drawWords, measureWords, type Word } from "~/lib/ink";

/*
 * 細: fine, detailed, the small parts of a thing. My intro says I care about the small things,
 * so this room takes it literally. The whole site is drawn small, as one engineering drawing: a frame with
 * grid references, every project a numbered detail, writing as notes, my name in the title block. You read it
 * through a loupe. The glass magnifies the real text, refracts at its rim, and clicks through it land on
 * the link you're looking at, not the one under your finger.
 */

const props = defineProps<{ content: RoomContent }>();
const takeArrival = useRoomArrival();

const latest = computed(() => {
	const dates = [...props.content.projects.map((project) => project.date), ...props.content.writings.map((post) => post.createdAt)].map((value) => Date.parse(value));
	return dates.length ? new Date(Math.max(...dates)).toISOString() : undefined;
});

const sheet = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const hit = ref<HTMLElement | null>(null);
const handle = ref<HTMLElement | null>(null);
const live = ref(false);
const power = ref(3.2);

const lens = { x: 0, y: 0, radius: 0, power: 1 };
const want = { x: 0, y: 0, radius: 150 };
let pointedLink: HTMLAnchorElement | null = null;

/** The page point the glass is showing at a given screen point. */
const throughGlass = (x: number, y: number) => ({ x: lens.x + (x - lens.x) / lens.power, y: lens.y + (y - lens.y) / lens.power });

const linkAt = (x: number, y: number) => {
	const el = hit.value;
	if (el) el.style.pointerEvents = "none";
	const found = document.elementFromPoint(x, y)?.closest<HTMLAnchorElement>(".sheet a");
	if (el) el.style.pointerEvents = "";
	return found ?? null;
};

/* ─── Pointer: the loupe follows a mouse; a finger carries it ─── */

let carry: { id: number; dx: number; dy: number; moved: boolean } | null = null;

const onWindowMove = (event: PointerEvent) => {
	if (event.pointerType !== "mouse") return;
	want.x = event.clientX;
	want.y = event.clientY;
};
const onHitDown = (event: PointerEvent) => {
	if (event.pointerType === "mouse") return;
	carry = { id: event.pointerId, dx: lens.x - event.clientX, dy: lens.y - event.clientY, moved: false };
	hit.value?.setPointerCapture(event.pointerId);
};
const onHitMove = (event: PointerEvent) => {
	if (!carry || event.pointerId !== carry.id) return;
	want.x = event.clientX + carry.dx;
	want.y = event.clientY + carry.dy;
	carry.moved = true;
};
const onHitUp = () => {
	carry = null;
};
const onHitClick = (event: MouseEvent) => {
	if (carry?.moved) return;
	const point = throughGlass(event.clientX, event.clientY);
	const link = linkAt(point.x, point.y);
	if (!link) return;
	const href = link.getAttribute("href") ?? "";
	if (link.target === "_blank") window.open(link.href, "_blank", "noopener,noreferrer");
	else if (href.startsWith("/")) navigateTo(href);
	else location.href = link.href;
};
const onWheel = (event: WheelEvent) => {
	event.preventDefault();
	power.value = clamp(power.value * Math.exp(-event.deltaY * 0.0015), 1.6, 7);
};
// Tabbing through the drawing moves the glass to whatever has focus.
const onFocusIn = (event: FocusEvent) => {
	const el = event.target as HTMLElement;
	if (!el.closest(".sheet")) return;
	el.scrollIntoView({ block: "nearest" });
	const box = el.getBoundingClientRect();
	want.x = box.left + box.width / 2;
	want.y = box.top + box.height / 2;
};
const onKey = (event: KeyboardEvent) => {
	if (event.key === "+" || event.key === "=") power.value = clamp(power.value * 1.15, 1.6, 7);
	if (event.key === "-") power.value = clamp(power.value / 1.15, 1.6, 7);
};

/* ─── Glass ─── */

const LENS_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 color;
uniform sampler2D u_view_tex;
uniform vec2 u_view;
uniform float u_dpr;
uniform vec3 u_lens;     // x, y, radius in css px
uniform vec3 u_bg;
uniform vec3 u_fg;
uniform float u_dark;
void main() {
	vec2 p = vec2(gl_FragCoord.x, u_view.y * u_dpr - gl_FragCoord.y) / u_dpr;
	vec2 d = p - u_lens.xy;
	float R = max(u_lens.z, 1.0);
	float r = length(d) / R;

	// The loupe's shadow on the sheet, offset down and right, as if lit from the top left.
	float shadowR = length(p - u_lens.xy - vec2(5.0, 9.0)) / R;
	float shadow = (1.0 - smoothstep(0.95, 1.18, shadowR)) * 0.22;
	vec4 outside = vec4(vec3(0.0), shadow);

	// Flat in the middle, bending only near the rim, with each colour bending a little differently.
	float bend = 1.0 + 0.22 * pow(r, 6.0);
	float fringe = 0.018 * pow(r, 5.0);
	vec2 base = d / (2.0 * R);
	vec3 col;
	col.r = texture(u_view_tex, 0.5 + base / (bend + fringe)).r;
	col.g = texture(u_view_tex, 0.5 + base / bend).g;
	col.b = texture(u_view_tex, 0.5 + base / (bend - fringe)).b;

	col *= 1.0 - 0.12 * smoothstep(0.75, 1.0, r);
	vec2 n = d / max(length(d), 1e-3);
	float glint = pow(max(dot(n, normalize(vec2(-0.6, -0.8))), 0.0), 10.0) * smoothstep(0.8, 0.97, r);
	col = mix(col, vec3(1.0), glint * mix(0.55, 0.25, u_dark));

	// The rim: a thin band, lighter where it faces the light.
	float rim = smoothstep(1.0, 1.006, r) * (1.0 - smoothstep(1.03, 1.036, r));
	vec3 rimColour = mix(u_fg, u_bg, 0.35 + 0.4 * dot(n, normalize(vec2(-0.6, -0.8))));
	vec4 glass = vec4(col, 1.0);
	glass = mix(glass, vec4(rimColour, 1.0), rim);

	float inLens = 1.0 - smoothstep(1.03, 1.036, r);
	vec4 result = mix(outside, glass, inLens);
	color = vec4(result.rgb * result.a, result.a);
}`;

onMounted(async () => {
	const reduce = prefersReducedMotion();
	const arrival = takeArrival();
	const gl = canvas.value ? createGL(canvas.value) : null;
	if (!gl || !sheet.value) return;

	let program: ReturnType<typeof createProgram>;
	try {
		program = createProgram(gl, FULLSCREEN_VS, LENS_FS);
	} catch (error) {
		console.error(error);
		return;
	}
	const triangle = createFullscreenTriangle(gl);
	live.value = true;
	await nextTick();
	await document.fonts.ready;

	let palette: Palette = readPalette();
	let dirty = true;
	const stopPalette = watchPalette((next) => {
		palette = next;
		dirty = true;
	});

	// The magnified view is redrawn every frame from the measured words, so it is always sharp at any power.
	const view = document.createElement("canvas");
	const ink = view.getContext("2d")!;
	const texture = gl.createTexture()!;
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	let words: Word[] = [];
	let strokes: { kind: "rect" | "circle"; x: number; y: number; w: number; h: number }[] = [];
	const measure = () => {
		words = measureWords(sheet.value!, ink);
		strokes = [...sheet.value!.querySelectorAll<HTMLElement>("[data-ink]")].map((el) => {
			const box = el.getBoundingClientRect();
			return { kind: el.dataset.ink === "circle" ? "circle" : "rect", x: box.left + scrollX, y: box.top + scrollY, w: box.width, h: box.height };
		});
	};

	const resizeObserver = new ResizeObserver(() => (dirty = true));
	resizeObserver.observe(sheet.value);
	const mutationObserver = new MutationObserver(() => (dirty = true));
	mutationObserver.observe(sheet.value, { subtree: true, characterData: true, childList: true });

	// Arriving: the glass grows out of the point you clicked and settles over my name.
	const name = sheet.value.querySelector<HTMLElement>(".sheet__name")?.getBoundingClientRect();
	lens.x = arrival.x;
	lens.y = arrival.y;
	want.x = name ? name.left + Math.min(name.width, 220) / 2 : innerWidth / 2;
	want.y = name ? name.top + name.height / 2 : innerHeight / 2;

	const stop = startLoop((_time, delta) => {
		if (dirty) {
			dirty = false;
			measure();
		}
		want.radius = clamp(Math.min(innerWidth, innerHeight) * 0.2, 96, 190);
		const rate = reduce ? 60 : 9;
		lens.x = damp(lens.x, want.x, rate, delta);
		lens.y = damp(lens.y, want.y, rate, delta);
		lens.radius = damp(lens.radius, want.radius, reduce ? 60 : 5, delta);
		lens.power = damp(lens.power, power.value, reduce ? 60 : 6, delta);

		const point = throughGlass(lens.x, lens.y);
		const pointed = linkAt(point.x, point.y);
		if (pointed !== pointedLink) {
			pointedLink = pointed;
			if (hit.value) hit.value.style.cursor = pointed ? "pointer" : "";
		}

		const size = Math.max(2, Math.round(lens.radius * 2));
		const dpr = Math.min(devicePixelRatio || 1, 2);
		if (view.width !== size * dpr) {
			view.width = size * dpr;
			view.height = size * dpr;
		}
		const scale = lens.power;
		const originX = lens.x + scrollX - lens.radius / scale;
		const originY = lens.y + scrollY - lens.radius / scale;
		ink.setTransform(1, 0, 0, 1, 0, 0);
		ink.fillStyle = `rgb(${palette.bg.map((c) => Math.round(c * 255)).join(",")})`;
		ink.fillRect(0, 0, view.width, view.height);
		ink.setTransform(dpr * scale, 0, 0, dpr * scale, -originX * dpr * scale, -originY * dpr * scale);
		ink.strokeStyle = `rgb(${palette.fg.map((c) => Math.round(c * 255)).join(",")})`;
		ink.lineWidth = 0.6;
		for (const stroke of strokes) {
			if (stroke.x > originX + size / scale || stroke.x + stroke.w < originX || stroke.y > originY + size / scale || stroke.y + stroke.h < originY) continue;
			ink.beginPath();
			if (stroke.kind === "circle") ink.arc(stroke.x + stroke.w / 2, stroke.y + stroke.h / 2, stroke.w / 2, 0, Math.PI * 2);
			else ink.rect(stroke.x, stroke.y, stroke.w, stroke.h);
			ink.stroke();
		}
		drawWords(ink, words, { originX, originY, scale, dpr, width: size, height: size, emphasis: pointedLink });

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, view);

		fitCanvas(canvas.value!);
		program.use();
		bindTarget(gl, null);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.uniform1i(program.uniforms.u_view_tex!, bindTexture(gl, 0, texture));
		gl.uniform2f(program.uniforms.u_view!, innerWidth, innerHeight);
		gl.uniform1f(program.uniforms.u_dpr!, gl.drawingBufferWidth / innerWidth);
		gl.uniform3f(program.uniforms.u_lens!, lens.x, lens.y, lens.radius);
		gl.uniform3fv(program.uniforms.u_bg!, palette.bg);
		gl.uniform3fv(program.uniforms.u_fg!, palette.fg);
		gl.uniform1f(program.uniforms.u_dark!, palette.dark ? 1 : 0);
		triangle();

		const reach = lens.radius * 1.12;
		if (hit.value) {
			hit.value.style.transform = `translate3d(${lens.x - reach}px, ${lens.y - reach}px, 0)`;
			hit.value.style.width = hit.value.style.height = `${reach * 2}px`;
		}
		if (handle.value) handle.value.style.transform = `translate3d(${lens.x + lens.radius * 0.74}px, ${lens.y + lens.radius * 0.74}px, 0)`;
	});

	const onResize = () => (dirty = true);
	addEventListener("pointermove", onWindowMove, { passive: true });
	addEventListener("resize", onResize);
	addEventListener("keydown", onKey);
	document.addEventListener("focusin", onFocusIn);
	document.fonts.addEventListener("loadingdone", onResize);

	onUnmounted(() => {
		stop();
		stopPalette();
		resizeObserver.disconnect();
		mutationObserver.disconnect();
		removeEventListener("pointermove", onWindowMove);
		removeEventListener("resize", onResize);
		removeEventListener("keydown", onKey);
		document.removeEventListener("focusin", onFocusIn);
		document.fonts.removeEventListener("loadingdone", onResize);
		gl.getExtension("WEBGL_lose_context")?.loseContext();
	});
});

const columns = ["A", "B", "C", "D", "E", "F", "G", "H"];
const rows = ["1", "2", "3", "4", "5", "6"];
</script>

<template>
	<div class="sai" :class="{ 'is-live': live }">
		<div ref="sheet" class="sheet">
			<div class="sheet__frame" data-ink="rect" aria-hidden="true" />
			<div class="sheet__refs sheet__refs--top mono" aria-hidden="true">
				<span v-for="mark in columns" :key="mark">{{ mark }}</span>
			</div>
			<div class="sheet__refs sheet__refs--side mono" aria-hidden="true">
				<span v-for="mark in rows" :key="mark">{{ mark }}</span>
			</div>

			<div class="sheet__field">
				<header class="sheet__intro">
					<p class="mono muted">{{ profile.kicker }}</p>
					<h1 class="sheet__name">
						{{ profile.name.first }} <em>{{ profile.name.last }}</em>
					</h1>
					<p class="sheet__lede">{{ profile.lede }} {{ profile.aside }}</p>
					<NowLine class="sheet__now" />
				</header>

				<section class="sheet__details" aria-labelledby="sai-projects">
					<h2 id="sai-projects" class="mono muted sheet__label">details · side projects</h2>
					<ol class="details">
						<li v-for="(project, i) in content.projects" :key="project.link" class="detail">
							<span class="detail__balloon mono" data-ink="circle">{{ i + 1 }}</span>
							<a :href="project.link" target="_blank" rel="noopener noreferrer" class="detail__title">{{ project.title }}</a>
							<span class="detail__about">{{ project.about }}</span>
							<span class="mono muted">{{ formatMonthYear(project.date) }} · {{ hostOf(project.link) }}</span>
						</li>
					</ol>
				</section>

				<section class="sheet__notes" aria-labelledby="sai-notes">
					<h2 id="sai-notes" class="mono sheet__label">notes · writing</h2>
					<ol class="notes">
						<li v-for="post in content.writings" :key="post.slug" class="note">
							<NuxtLink :to="`/writings/${post.slug}`" class="note__title">{{ post.title }}</NuxtLink>
							<span class="note__text">{{ post.description }}</span>
							<span class="mono muted">{{ formatMonthYear(post.createdAt) }} · {{ post.readTime }} min</span>
						</li>
					</ol>
				</section>

				<footer class="titleblock" data-ink="rect">
					<div class="titleblock__cell" data-ink="rect">
						<span class="mono muted">drawn by</span><span>{{ profile.name.first }} {{ profile.name.last }}</span>
					</div>
					<div class="titleblock__cell" data-ink="rect">
						<span class="mono muted">title</span><span>{{ profile.kicker }}</span>
					</div>
					<div class="titleblock__cell titleblock__cell--wide" data-ink="rect">
						<span class="mono muted">contact</span>
						<span
							>Write to me at <a :href="`mailto:${profile.email}`">{{ profile.email }}</a
							>, or find me on
							<template v-for="(link, i) in profile.links" :key="link.href"
								><a :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.label }}</a
								>{{ i === profile.links.length - 2 ? " and " : i < profile.links.length - 1 ? ", " : "." }}</template
							></span
						>
					</div>
					<div class="titleblock__cell" data-ink="rect">
						<span class="mono muted">scale</span><span>1 : {{ power.toFixed(1) }}, read with the glass</span>
					</div>
					<div class="titleblock__cell" data-ink="rect">
						<span class="mono muted">revised</span><span>{{ formatMonthYear(latest) }}</span>
					</div>
					<div class="titleblock__cell titleblock__cell--wide" data-ink="rect">
						<span lang="ja" class="titleblock__word">{{ profile.ganbaru.word }}</span><span class="mono muted"><i>{{ profile.ganbaru.reading }}</i>: {{ profile.ganbaru.gloss }}</span>
					</div>
				</footer>
			</div>
		</div>

		<canvas v-show="live" ref="canvas" class="sai__canvas" aria-hidden="true" />
		<div v-show="live" ref="hit" class="sai__hit" aria-hidden="true" @pointerdown="onHitDown" @pointermove="onHitMove" @pointerup="onHitUp" @pointercancel="onHitUp" @click="onHitClick" @wheel="onWheel" />
		<div v-show="live" ref="handle" class="sai__handle mono" aria-hidden="true">
			<span lang="ja" class="sai__seed" data-room-seed>細</span><span>×{{ power.toFixed(1) }}</span>
		</div>
		<p v-show="live" class="sai__hint mono">everything here is drawn small. look closer: move the glass, scroll on it to change its power</p>
	</div>
</template>

<style scoped>
.sai {
	--u: 1;
	position: relative;
}
/* Without the glass the drawing is set at reading size. */
.sai:not(.is-live) {
	--u: 2.1;
}

.sheet {
	position: relative;
	min-height: 100svh;
	padding: calc(var(--u) * 34px) calc(var(--u) * 34px) calc(var(--u) * 30px);
	font-size: calc(var(--u) * 6.5px);
	line-height: 1.4;
}
.sheet .mono {
	font-size: calc(var(--u) * 5.2px);
}
.sheet__frame {
	position: absolute;
	inset: calc(var(--u) * 16px);
	border: 0.75px solid var(--fg);
	pointer-events: none;
}
.sheet__refs {
	position: absolute;
	display: flex;
	justify-content: space-around;
	color: var(--muted);
}
.sheet__refs--top {
	top: calc(var(--u) * 6px);
	left: calc(var(--u) * 16px);
	right: calc(var(--u) * 16px);
}
.sheet__refs--side {
	flex-direction: column;
	top: calc(var(--u) * 16px);
	bottom: calc(var(--u) * 16px);
	left: calc(var(--u) * 6px);
}

.sheet__field {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.8fr);
	grid-template-areas:
		"intro details notes"
		"intro details notes"
		"details details title";
	gap: calc(var(--u) * 18px) calc(var(--u) * 26px);
	align-items: start;
}
.sheet__intro {
	grid-area: intro;
	display: grid;
	gap: calc(var(--u) * 8px);
	max-width: calc(var(--u) * 260px);
}
.sheet__name {
	font-weight: 300;
	font-size: calc(var(--u) * 30px);
	line-height: 0.95;
	letter-spacing: -0.03em;
}
.sheet__name em {
	display: block;
	font-weight: 250;
}
.sheet__lede {
	font-size: calc(var(--u) * 8px);
	line-height: 1.45;
}
.sheet__now {
	font-size: calc(var(--u) * 6.5px);
}
.sheet__label {
	font-weight: 400;
	margin-bottom: calc(var(--u) * 6px);
}
.sheet__details {
	grid-area: details;
}
.details {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(calc(var(--u) * 120px), 1fr));
	gap: calc(var(--u) * 10px) calc(var(--u) * 14px);
}
.detail {
	position: relative;
	display: grid;
	gap: calc(var(--u) * 1.5px);
	padding-left: calc(var(--u) * 16px);
}
.detail__balloon {
	position: absolute;
	left: 0;
	top: 0;
	display: grid;
	place-items: center;
	width: calc(var(--u) * 11px);
	height: calc(var(--u) * 11px);
	border: 0.6px solid var(--fg);
	border-radius: 50%;
	font-size: calc(var(--u) * 4.6px) !important;
}
.detail__title {
	font-size: calc(var(--u) * 8.5px);
	line-height: 1.15;
}
.detail__title:hover,
.note__title:hover {
	font-style: italic;
}
.detail__about {
	color: var(--muted);
}
.sheet__notes {
	grid-area: notes;
}
.notes {
	display: grid;
	gap: calc(var(--u) * 8px);
	list-style: decimal;
	padding-left: calc(var(--u) * 10px);
}
.note {
	display: grid;
	gap: calc(var(--u) * 1.5px);
}
.note::marker {
	font-family: "IBM Plex Mono", ui-monospace, monospace;
	color: var(--muted);
}
.note__title {
	font-style: italic;
	font-size: calc(var(--u) * 8px);
}
.note__text {
	color: var(--muted);
}

.titleblock {
	grid-area: title;
	display: grid;
	grid-template-columns: 1fr 1fr;
	border: 0.75px solid var(--fg);
}
.titleblock__cell {
	display: grid;
	gap: calc(var(--u) * 1px);
	padding: calc(var(--u) * 4px) calc(var(--u) * 5px);
	border: 0.5px solid var(--rule);
}
.titleblock__cell--wide {
	grid-column: 1 / -1;
}
.titleblock__cell a {
	font-style: italic;
	text-decoration: underline;
	text-decoration-thickness: 0.5px;
}
.titleblock__word {
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-weight: 800;
	font-size: calc(var(--u) * 14px);
	line-height: 1;
}

.sai__canvas {
	position: fixed;
	inset: 0;
	z-index: 20;
	width: 100%;
	height: 100%;
	pointer-events: none;
}
.sai__hit {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 21;
	border-radius: 50%;
	touch-action: none;
}
.sai__handle {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 22;
	display: flex;
	align-items: baseline;
	gap: 0.35rem;
	padding: 0.15rem 0.4rem;
	background: var(--bg);
	border: 1px solid var(--rule);
	pointer-events: none;
	white-space: nowrap;
}
.sai__seed {
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-size: 1rem;
	line-height: 1;
}
.sai__hint {
	position: fixed;
	z-index: 19;
	left: var(--gutter);
	bottom: 0.4rem;
	color: var(--muted);
}

@media (max-width: 52rem) {
	.sheet__field {
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: "intro" "details" "notes" "title";
	}
	.sai {
		--u: 1.3;
	}
	.sai:not(.is-live) {
		--u: 2;
	}
}
</style>
