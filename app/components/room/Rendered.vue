<script setup lang="ts">
import type { RoomContent } from "~/composables/useRoomContent";
import { clamp, createGL, damp, prefersReducedMotion, readPalette, startLoop, watchPalette, type Palette } from "~/lib/gl";
import { Atlas, fontString, type Face } from "~/lib/render/atlas";
import { DrawList, fitSize, setText, setVertical, type Span } from "~/lib/render/layout";
import { MAX_HITS, Renderer, type Frame, type Mode } from "~/lib/render/renderer";

/*
 * 描: to draw. This page has no HTML text you can see. Every letter is a signed distance field made in your
 * browser from the site's own fonts, laid out by a line breaker written for it, and drawn in two draw calls.
 * A seam splits the page: left of it, the page finished; right of it, how it's drawn (the field as contour
 * lines, the quads and line boxes, or the hit buffer). Drag it anywhere. The cursor presses into the large type
 * like a nib. "view source" changes the type live. A hidden copy of the page stays in the DOM for screen
 * readers and the keyboard.
 */

const props = defineProps<{ content: RoomContent }>();
const now = useNowPlaying();
const takeArrival = useRoomArrival();

const FACES = {
	display: { key: "display", font: "normal 300 Newsreader, Georgia, serif", base: 112, radius: 14, oversample: 3 },
	displayItalic: { key: "displayItalic", font: "italic 250 Newsreader, Georgia, serif", base: 112, radius: 14, oversample: 3 },
	serif: { key: "serif", font: "normal 400 Newsreader, Georgia, serif", base: 44, radius: 7 },
	light: { key: "light", font: "normal 300 Newsreader, Georgia, serif", base: 48, radius: 8 },
	italic: { key: "italic", font: "italic 400 Newsreader, Georgia, serif", base: 44, radius: 7 },
	mono: { key: "mono", font: "normal 400 'IBM Plex Mono', ui-monospace, Menlo, monospace", base: 32, radius: 6 },
	jp: { key: "jp", font: "normal 800 'Shippori Mincho B1', 'Hiragino Mincho ProN', 'Yu Mincho', serif", base: 80, radius: 11, oversample: 2 },
} satisfies Record<string, Face>;

/* ─── Live parameters: the "view source" panel ─── */

const DEFAULTS = { weight: 0, softness: 0, tracking: 0, leading: 1, measure: 1, size: 1 };
const params = reactive({ ...DEFAULTS });
const mode = ref<Mode>("field");
const showAtlas = ref(false);
const MACHINE: Mode[] = ["field", "quads", "hits"];
const panelOpen = ref(false);
const stats = reactive({ glyphs: 0, atlas: "", atlasGlyphs: 0, layout: 0, frame: 0 });

const CONTROLS = [
	{ key: "weight", label: "weight", min: -0.8, max: 1.4, step: 0.01, unit: "px", note: "moves the edge of every letter along its distance field" },
	{ key: "softness", label: "softness", min: 0, max: 3, step: 0.01, unit: "px", note: "widens the antialiasing band" },
	{ key: "tracking", label: "tracking", min: -0.04, max: 0.2, step: 0.002, unit: "em", note: "letter spacing, then a fresh line break" },
	{ key: "leading", label: "leading", min: 0.8, max: 1.5, step: 0.01, unit: "×", note: "line height" },
	{ key: "measure", label: "measure", min: 0.6, max: 1.25, step: 0.01, unit: "×", note: "how wide paragraphs are allowed to run" },
	{ key: "size", label: "size", min: 0.8, max: 1.3, step: 0.01, unit: "×", note: "every text size at once" },
] as const;

const MODE_NOTES: Record<Mode, string> = {
	field: "Right of the seam: the distance field as contour lines. The letter is wherever the field crosses its edge, so weight is just moving that edge.",
	quads: "One quad per glyph, each padded so the field has room. Line boxes and baselines from the line breaker.",
	hits: "The hit buffer. Each link and row is drawn in its own colour; hover reads back the one pixel under the pointer.",
};
const ATLAS_NOTE = "The atlas: every character this page uses, rasterised from its webfont in your browser, then turned into a distance field.";

/* ─── Hits: links and rows, by id ─── */

interface Hit {
	href: string;
	external: boolean;
	label: string;
	group: "projects" | "writing" | null;
}

/** Turn the content into a laid-out page. Ids are handed out in order, so they're stable between layouts. */
const compose = (atlas: Atlas, width: number, height: number) => {
	const started = performance.now();
	const list = new DrawList(atlas, params.tracking, params.leading);
	const hits: Hit[] = [{ href: "", external: false, label: "", group: null }];
	const hit = (entry: Hit) => hits.push(entry) - 1;
	const F = FACES;
	const s = params.size;

	const wide = width >= 960;
	const gutter = clamp(width * 0.05, 18, 64);
	const margin = wide ? 180 : 0;
	const inner = width - gutter * 2;
	const measure = params.measure;

	// Top line: what's drawing this.
	setText(list, [{ text: `drawn by its own renderer · ${stats.glyphs.toLocaleString("en-GB")} glyphs · 2 draw calls · ${stats.frame.toFixed(2)} ms`, face: F.mono, tone: 1 }], {
		key: "stats",
		x: gutter,
		y: 26,
		width: inner - 120,
		size: 11 * s,
	});

	// The name, set to fill the measure exactly, the second line stepped in.
	const heroTop = wide ? Math.max(130, height * 0.17) : 96;
	setText(list, [{ text: profile.kicker, face: F.mono, tone: 1 }], { key: "kicker", x: gutter, y: heroTop, width: inner, size: 12 * s });
	const column = wide ? inner - 140 : inner;
	const indent = wide ? column * 0.2 : 0;
	const first = fitSize(atlas, F.display, profile.name.first, column * 0.94);
	const second = fitSize(atlas, F.displayItalic, profile.name.last, (column - indent) * 0.9);
	const nameSize = Math.min(first, second * 1.08);
	const nameTop = heroTop + 30;
	setText(list, [{ text: profile.name.first, face: F.display }], { key: "first", x: gutter - nameSize * 0.04, y: nameTop, width: column * 1.2, size: nameSize, leading: 0.95 });
	setText(list, [{ text: profile.name.last, face: F.displayItalic }], { key: "last", x: gutter + indent, y: nameTop + nameSize * 0.9, width: column * 1.2, size: nameSize, leading: 0.95 });

	if (wide) {
		const glyphSize = 66 * s;
		const tall = setVertical(list, profile.ganbaru.word, F.jp, { key: "ganbaru", x: width - gutter - glyphSize / 2, y: heroTop, size: glyphSize });
		setText(list, [{ text: profile.ganbaru.reading, face: F.italic, tone: 1 }], {
			key: "ganbaru-reading",
			x: width - gutter - 120,
			y: heroTop + tall + 8,
			width: 120,
			size: 13 * s,
			align: "right",
		});
	}

	let y = nameTop + nameSize * 1.95 + (wide ? 36 : 24);
	const proseX = gutter + indent;
	const proseWidth = Math.min(inner - indent, 560 * measure * s);
	y += setText(list, [{ text: `${profile.lede} ${profile.aside}`, face: F.serif }], { key: "lede", x: proseX, y, width: proseWidth, size: (wide ? 21 : 18) * s, leading: 1.5 }).height + 22;

	// The same sentence as the paper site's now line, laid out here, live.
	if (now.ready.value) {
		const track = now.track.value;
		const spans: Span[] = [
			{ text: "It’s ", face: F.serif, tone: 1 },
			{ text: now.clock.value, face: F.mono, tone: 0 },
			{ text: ` for me${now.lead.value}`, face: F.serif, tone: 1 },
		];
		if (track) {
			const trackHit = hit({ href: track.url, external: true, label: `${track.title} by ${track.artist}`, group: null });
			spans.push({ text: track.title, face: F.italic, tone: 0, hit: trackHit, underline: "progress" }, { text: ` by ${track.artist}.`, face: F.serif, tone: 1 });
			if (now.playing.value) spans.push({ text: `  ${formatDuration(now.elapsed.value)} / ${formatDuration(track.duration)}`, face: F.mono, tone: 1 });
		}
		y += setText(list, spans, { key: "now", x: proseX, y, width: Math.min(proseWidth * 1.1, inner - indent), size: 16 * s, leading: 1.6 }).height;
	}
	y = Math.max(y + (wide ? 110 : 72), wide ? height * 0.98 : 0);

	const section = (key: string, label: string) => {
		list.rect({ key: `${key}:rule`, x: gutter, y, w: inner, h: 1, kind: "rule" });
		setText(list, [{ text: label, face: F.mono, tone: 1 }], { key: `${key}:label`, x: gutter, y: y + 22, width: margin || inner, size: 11 * s });
		y += wide ? 22 : 54;
	};
	const contentX = gutter + margin;
	const contentWidth = inner - margin;

	// Side projects: an index, one row per project, the whole row a link.
	section("projects", `side projects · ${props.content.projects.length}`);
	props.content.projects.forEach((project, i) => {
		const id = hit({ href: project.link, external: true, label: project.title, group: "projects" });
		const top = y;
		const pad = 14 * s;
		if (wide) {
			const titleWidth = 230 * s;
			const hostWidth = 190;
			const a = setText(list, [{ text: project.title, face: F.serif, hit: id }], { key: `p${i}:t`, x: contentX, y: top + pad, width: titleWidth, size: 22 * s, leading: 1.25 });
			const b = setText(list, [{ text: project.about, face: F.serif, tone: 1, hit: id }], {
				key: `p${i}:a`,
				x: contentX + titleWidth + 24,
				y: top + pad + 3 * s,
				width: Math.min(contentWidth - titleWidth - hostWidth - 48, 460 * measure * s),
				size: 16 * s,
				leading: 1.45,
			});
			setText(list, [{ text: `${hostOf(project.link)} ↗`, face: F.mono, tone: 1, hit: id }], {
				key: `p${i}:h`,
				x: contentX + contentWidth - hostWidth,
				y: top + pad + 6 * s,
				width: hostWidth,
				size: 11 * s,
				align: "right",
			});
			y = top + Math.max(a.height, b.height) + pad * 2;
		} else {
			const a = setText(list, [{ text: project.title, face: F.serif, hit: id }], { key: `p${i}:t`, x: contentX, y: top + pad, width: contentWidth, size: 21 * s, leading: 1.25 });
			const b = setText(list, [{ text: project.about, face: F.serif, tone: 1, hit: id }], {
				key: `p${i}:a`,
				x: contentX,
				y: top + pad + a.height + 2,
				width: contentWidth,
				size: 16 * s,
				leading: 1.45,
			});
			const c = setText(list, [{ text: `${hostOf(project.link)} ↗`, face: F.mono, tone: 1, hit: id }], {
				key: `p${i}:h`,
				x: contentX,
				y: top + pad + a.height + b.height + 6,
				width: contentWidth,
				size: 11 * s,
			});
			y = top + a.height + b.height + c.height + pad * 2 + 8;
		}
		list.rect({ key: `p${i}:box`, x: contentX, y: top, w: contentWidth, h: y - top, hit: id, kind: "box" });
		list.rect({ key: `p${i}:rule`, x: contentX, y: y - 1, w: contentWidth, h: 1, kind: "rule" });
	});
	y += wide ? 100 : 64;

	section("writing", `writing · ${props.content.writings.length}`);
	props.content.writings.forEach((post, i) => {
		const id = hit({ href: `/writings/${post.slug}`, external: false, label: post.title, group: "writing" });
		const top = y;
		const pad = 16 * s;
		const metaWidth = wide ? 160 : contentWidth;
		const a = setText(list, [{ text: post.title, face: F.serif, hit: id }], {
			key: `w${i}:t`,
			x: contentX,
			y: top + pad,
			width: wide ? contentWidth - metaWidth - 24 : contentWidth,
			size: 25 * s,
			leading: 1.2,
		});
		const meta = `${formatMonthYear(post.createdAt)} · ${post.readTime} min`;
		const b = wide
			? setText(list, [{ text: meta, face: F.mono, tone: 1, hit: id }], {
					key: `w${i}:m`,
					x: contentX + contentWidth - metaWidth,
					y: top + pad + 9 * s,
					width: metaWidth,
					size: 11 * s,
					align: "right",
				})
			: setText(list, [{ text: meta, face: F.mono, tone: 1, hit: id }], { key: `w${i}:m`, x: contentX, y: top + pad + a.height + 4, width: contentWidth, size: 11 * s });
		y = top + (wide ? a.height : a.height + b.height + 4) + pad * 2;
		list.rect({ key: `w${i}:box`, x: contentX, y: top, w: contentWidth, h: y - top, hit: id, kind: "box" });
		list.rect({ key: `w${i}:rule`, x: contentX, y: y - 1, w: contentWidth, h: 1, kind: "rule" });
	});
	y += wide ? 100 : 64;

	section("contact", "contact");
	const contact: Span[] = [{ text: "Write to me at ", face: F.light }];
	contact.push({ text: profile.email, face: F.italic, hit: hit({ href: `mailto:${profile.email}`, external: false, label: profile.email, group: null }), underline: true });
	contact.push({ text: ", or find me on ", face: F.light });
	profile.links.forEach((link, i) => {
		contact.push({ text: link.label, face: F.italic, hit: hit({ href: link.href, external: true, label: link.label, group: null }), underline: true });
		contact.push({ text: i === profile.links.length - 2 ? " and " : i < profile.links.length - 1 ? ", " : ".", face: F.light });
	});
	y += setText(list, contact, { key: "contact", x: contentX, y, width: Math.min(contentWidth, 760 * measure * s), size: (wide ? 40 : 28) * s, leading: 1.22 }).height + (wide ? 110 : 72);

	section("ganbaru", profile.ganbaru.reading);
	const sum = setText(
		list,
		[
			{ text: `${profile.ganbaru.sum} `, face: F.light },
			{ text: profile.ganbaru.kept, face: F.light, tone: 1 },
		],
		{
			key: "sum",
			x: contentX,
			y,
			width: Math.min(contentWidth, 580 * measure * s),
			size: 22 * s,
			leading: 1.4,
		}
	);
	y += sum.height + 64;
	setText(list, [{ text: `© ${new Date().getFullYear()} Abdullahi Odesanmi · press \` to view source`, face: F.mono, tone: 1 }], { key: "end", x: gutter, y, width: inner, size: 11 * s });
	list.height = y + 90;

	stats.layout = performance.now() - started;
	return { list, hits };
};

/* ─── Mount ─── */

/* ─── The seam ─── */

const seam = ref(0);
const viewportWidth = ref(1440);
const seamPercent = computed(() => Math.round((seam.value / viewportWidth.value) * 100));
let seamTouched = false;
// On a wide screen a strip of machinery stays visible; on a phone the page is shown whole and the seam waits at the edge.
const seamRest = () => (innerWidth >= 960 ? innerWidth * 0.8 : innerWidth);
const onSeamDown = (event: PointerEvent) => {
	(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	seamTouched = true;
	const move = (e: PointerEvent) => (seam.value = clamp(e.clientX, 0, innerWidth));
	const up = () => {
		removeEventListener("pointermove", move);
		removeEventListener("pointerup", up);
	};
	addEventListener("pointermove", move);
	addEventListener("pointerup", up);
};
const onSeamKey = (event: KeyboardEvent) => {
	const step = event.shiftKey ? innerWidth * 0.2 : innerWidth * 0.05;
	if (event.key === "ArrowLeft") seam.value = clamp(seam.value - step, 0, innerWidth);
	else if (event.key === "ArrowRight") seam.value = clamp(seam.value + step, 0, innerWidth);
	else if (event.key === "Home") seam.value = 0;
	else if (event.key === "End") seam.value = innerWidth;
	else return;
	seamTouched = true;
	event.preventDefault();
};

const canvas = ref<HTMLCanvasElement | null>(null);
const pageHeight = ref(0);
const failed = ref(false);
const hits = shallowRef<Hit[]>([]);
const focused = ref(0);

// Registered up front: lifecycle hooks can't be added after the awaits below.
const cleanups: (() => void)[] = [];
onUnmounted(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

const onKey = (event: KeyboardEvent) => {
	if (event.target instanceof HTMLInputElement) return;
	if (event.key === "`") panelOpen.value = !panelOpen.value;
	const index = Number(event.key) - 1;
	if (MACHINE[index]) mode.value = MACHINE[index]!;
	if (event.key === "4") showAtlas.value = !showAtlas.value;
};

onMounted(async () => {
	const reduce = prefersReducedMotion();
	const arrival = takeArrival();
	const gl = canvas.value ? createGL(canvas.value, { alpha: false, antialias: false }) : null;
	if (!gl) {
		failed.value = true;
		return;
	}

	await Promise.all(Object.values(FACES).map((face) => document.fonts.load(fontString(face, 32), face.key === "jp" ? profile.ganbaru.word : "Aa1").catch(() => [])));
	// The visitor may have left while the fonts were loading.
	if (!canvas.value?.isConnected) return;
	const atlas = new Atlas();
	// Seed the atlas with everything printable, so a new song title rarely needs a rebuild.
	const printable = new Set([..."!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~’‘“”–—·↗→…©"]);
	atlas.build(
		new Map<Face, Set<string>>([
			[FACES.serif, printable],
			[FACES.italic, printable],
			[FACES.light, printable],
			[FACES.mono, printable],
		])
	);
	compose(atlas, innerWidth, innerHeight);
	atlas.build();

	let renderer: Renderer;
	try {
		renderer = new Renderer(gl, atlas);
	} catch (error) {
		console.error(error);
		failed.value = true;
		return;
	}

	let palette: Palette = readPalette();
	const stopPalette = watchPalette((next) => (palette = next));
	let dirty = false;
	let glide = false;

	const relayout = (withGlide: boolean) => {
		const result = compose(atlas, innerWidth, innerHeight);
		if (atlas.missing.size) {
			atlas.build();
			renderer.uploadAtlas();
			Object.assign(result, compose(atlas, innerWidth, innerHeight));
		}
		renderer.setList(result.list, withGlide && !reduce);
		hits.value = result.hits;
		hitTops.clear();
		for (const rect of result.list.rects) if (rect.hit && !hitTops.has(rect.hit)) hitTops.set(rect.hit, rect.y);
		pageHeight.value = result.list.height;
		stats.glyphs = renderer.glyphCount;
		stats.atlas = `${atlas.width}×${atlas.height}`;
		stats.atlasGlyphs = atlas.glyphs.size;
	};
	relayout(false);

	const schedule = (withGlide = true) => {
		dirty = true;
		glide ||= withGlide;
	};
	const stopParams = watch(params, () => schedule(true), { deep: true });
	const stopNow = watch([now.clock, now.track, now.ready, now.lead], () => schedule(true));
	const ticker = setInterval(() => schedule(true), 1000);
	viewportWidth.value = innerWidth;
	const onResize = () => {
		viewportWidth.value = innerWidth;
		schedule(true);
		if (!seamTouched) seam.value = seamRest();
	};
	addEventListener("resize", onResize);
	addEventListener("keydown", onKey);

	/* Pointer: GPU pick */
	const pointer = { x: -1, y: -1, moved: false };
	let pressure = 0;
	let hovered = 0;
	const onMove = (event: PointerEvent) => {
		pointer.x = event.clientX;
		pointer.y = event.clientY;
		pointer.moved = true;
	};
	const onLeave = () => {
		pointer.x = -1;
		pointer.moved = true;
	};
	const onClick = () => {
		const target = hits.value[hovered];
		if (!target?.href) return;
		if (target.external) window.open(target.href, "_blank", "noopener,noreferrer");
		else if (target.href.startsWith("/")) navigateTo(target.href);
		else location.href = target.href;
	};
	canvas.value!.addEventListener("pointermove", onMove);
	canvas.value!.addEventListener("pointerleave", onLeave);
	canvas.value!.addEventListener("click", onClick);

	const hover = new Float32Array(MAX_HITS);
	const dim = new Float32Array(MAX_HITS);
	const ring = new Float32Array(MAX_HITS);
	const start = performance.now() / 1000;
	let lastScroll = -1;
	let frameAverage = 0;

	const frameOf = (time: number): Frame => ({
		width: innerWidth,
		height: innerHeight,
		dpr: gl.drawingBufferWidth / innerWidth,
		scroll: scrollY,
		time,
		palette,
		mode: mode.value,
		seam: seam.value,
		pointer: { x: pointer.x, y: pointer.y },
		pressure,
		weight: params.weight,
		softness: params.softness,
		progress: now.progress.value,
		reveal: { x: arrival.x, y: arrival.y, start: reduce ? -100 : start },
	});

	const stop = startLoop((time, delta) => {
		const began = performance.now();
		const dpr = Math.min(devicePixelRatio || 1, 2);
		const w = Math.round(innerWidth * dpr);
		const h = Math.round(innerHeight * dpr);
		if (canvas.value!.width !== w || canvas.value!.height !== h) {
			canvas.value!.width = w;
			canvas.value!.height = h;
		}
		if (dirty) {
			relayout(glide);
			dirty = false;
			glide = false;
		}
		renderer.step(delta, reduce);
		pressure = damp(pressure, pointer.x >= 0 && !reduce ? 1 : 0, 4, delta);

		// On arrival the seam sweeps across, so the page renders in front of you, then rests near the right edge.
		const elapsed = time - start;
		if (!seamTouched) seam.value = reduce ? seamRest() : seamRest() * (1 - Math.pow(1 - clamp((elapsed - 0.35) / 2.2, 0, 1), 3));
		const frame = frameOf(time);

		if (pointer.moved || scrollY !== lastScroll) {
			hovered = pointer.x < 0 ? 0 : renderer.pick(frame, pointer.x, pointer.y);
			canvas.value!.style.cursor = hovered ? "pointer" : "";
			pointer.moved = false;
			lastScroll = scrollY;
		}

		// Hover, the rest of a list receding, and the focus ring, eased per link and handed to the GPU as a texture.
		const group = hits.value[hovered]?.group ?? null;
		for (let i = 1; i < hits.value.length && i < MAX_HITS; i++) {
			const entry = hits.value[i]!;
			hover[i] = damp(hover[i]!, i === hovered ? 1 : 0, reduce ? 60 : 10, delta);
			dim[i] = damp(dim[i]!, group && entry.group === group && i !== hovered ? 1 : 0, reduce ? 60 : 8, delta);
			ring[i] = damp(ring[i]!, i === focused.value ? 1 : 0, reduce ? 60 : 12, delta);
			renderer.state.set([Math.round(hover[i]! * 255), Math.round(dim[i]! * 255), Math.round(ring[i]! * 255), 0], i * 4);
		}

		renderer.draw(frame);
		if (showAtlas.value) {
			const boxWidth = Math.min(innerWidth - 48, 760);
			renderer.drawAtlas(frame, { x: innerWidth - boxWidth - 24, y: 72, w: boxWidth, h: (boxWidth * atlas.height) / atlas.width });
		}
		frameAverage = frameAverage * 0.95 + (performance.now() - began) * 0.05;
		stats.frame = frameAverage;
	});

	cleanups.push(() => {
		stop();
		stopPalette();
		stopParams();
		stopNow();
		clearInterval(ticker);
		removeEventListener("resize", onResize);
		removeEventListener("keydown", onKey);
		renderer.dispose();
	});
});

/* ─── The hidden page, for screen readers and the keyboard ─── */

const hitTops = new Map<number, number>();
const mirrorFocus = (id: number) => {
	focused.value = id;
	const top = hitTops.get(id);
	if (id && top !== undefined && (top < scrollY + 80 || top > scrollY + innerHeight - 120)) scrollTo({ top: top - innerHeight * 0.35, behavior: prefersReducedMotion() ? "auto" : "smooth" });
};
// Internal links go through the router; everything else behaves like a normal link.
const followMirror = (event: MouseEvent, entry: Hit) => {
	if (entry.external || !entry.href.startsWith("/")) return;
	event.preventDefault();
	navigateTo(entry.href);
};
const reset = () => Object.assign(params, DEFAULTS);
</script>

<template>
	<div class="rendered" :style="{ height: pageHeight ? `${pageHeight}px` : '100svh' }">
		<canvas ref="canvas" class="rendered__canvas" aria-hidden="true" />

		<!-- The same page as real HTML, out of sight. Focus moves a ring on the canvas. -->
		<div class="sr-only">
			<p>{{ profile.kicker }}</p>
			<h1>{{ profile.name.first }} {{ profile.name.last }}</h1>
			<p>{{ profile.lede }} {{ profile.aside }}</p>
			<NowLine />
			<template v-for="(entry, id) in hits" :key="id">
				<a
					v-if="id > 0"
					:href="entry.href"
					:target="entry.external ? '_blank' : undefined"
					:rel="entry.external ? 'noopener noreferrer' : undefined"
					@focus="mirrorFocus(id)"
					@blur="mirrorFocus(0)"
					@click="followMirror($event, entry)"
					>{{ entry.label }}</a
				>
			</template>
			<p>{{ profile.ganbaru.sum }} {{ profile.ganbaru.kept }}</p>
		</div>

		<div v-if="!failed" class="seam" :class="{ 'is-right': seam > viewportWidth - 90, 'is-left': seam < 90 }" :style="{ transform: `translateX(${seam}px)` }">
			<span class="seam__line" aria-hidden="true" />
			<button
				type="button"
				class="seam__handle mono"
				role="slider"
				aria-label="Seam between the finished page and how it is drawn"
				:aria-valuenow="seamPercent"
				aria-valuemin="0"
				aria-valuemax="100"
				:aria-valuetext="`${seamPercent}% finished page, the rest showing the ${mode}`"
				@pointerdown="onSeamDown"
				@keydown="onSeamKey"
			>
				<span>page</span><span class="seam__grip" aria-hidden="true">⟷</span><span>{{ mode }}</span>
			</button>
		</div>

		<p v-if="failed" class="rendered__failed mono">This room is drawn with WebGL2, which this browser doesn’t offer. The paper room has everything.</p>

		<aside class="source" :class="{ 'is-open': panelOpen }">
			<button type="button" class="source__toggle mono" :aria-expanded="panelOpen" aria-controls="source-panel" @click="panelOpen = !panelOpen">
				<span lang="ja" class="source__seed" data-room-seed aria-hidden="true">描</span>
				{{ panelOpen ? "close source" : "view source" }}
			</button>
			<div v-show="panelOpen" id="source-panel" class="source__panel mono">
				<div class="source__modes" role="radiogroup" aria-label="What the seam reveals">
					<button v-for="(item, i) in MACHINE" :key="item" type="button" role="radio" :aria-checked="mode === item" class="source__mode" @click="mode = item">
						<span class="muted">{{ i + 1 }}</span> {{ item }}
					</button>
					<button type="button" class="source__mode" :aria-pressed="showAtlas" @click="showAtlas = !showAtlas"><span class="muted">4</span> atlas</button>
				</div>
				<p class="source__note">{{ showAtlas ? ATLAS_NOTE : MODE_NOTES[mode] }}</p>
				<label v-for="control in CONTROLS" :key="control.key" class="source__control" :title="control.note">
					<span>{{ control.label }}</span>
					<input v-model.number="params[control.key]" type="range" :min="control.min" :max="control.max" :step="control.step" />
					<span class="source__value">{{ params[control.key].toFixed(control.unit === "em" ? 3 : 2) }}{{ control.unit }}</span>
				</label>
				<p class="source__stats muted">
					{{ stats.glyphs.toLocaleString("en-GB") }} glyphs · atlas {{ stats.atlas }} R8 · {{ stats.atlasGlyphs }} distance fields in {{ Object.keys(FACES).length }} faces · layout
					{{ stats.layout.toFixed(1) }} ms · frame {{ stats.frame.toFixed(2) }} ms
				</p>
				<button type="button" class="source__reset" @click="reset">reset</button>
			</div>
		</aside>
	</div>
</template>

<style scoped>
.rendered {
	position: relative;
}
.rendered__canvas {
	position: fixed;
	inset: 0;
	width: 100%;
	height: 100%;
	touch-action: pan-y;
}
.seam {
	position: fixed;
	z-index: 20;
	top: 0;
	bottom: 0;
	left: 0;
	width: 0;
	pointer-events: none;
}
.seam__line {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	width: 1px;
	background: var(--fg);
	opacity: 0.55;
}
.seam__handle {
	position: absolute;
	top: 50%;
	left: 0;
	translate: -50% -50%;
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	padding: 0.35rem 0.6rem;
	background: var(--bg);
	border: 1px solid var(--fg);
	color: var(--fg);
	cursor: ew-resize;
	pointer-events: auto;
	touch-action: none;
	white-space: nowrap;
}
/* Near either edge the handle tucks inside the screen rather than hanging off it. */
.seam.is-right .seam__handle {
	translate: -100% -50%;
}
.seam.is-left .seam__handle {
	translate: 0 -50%;
}
.seam__handle span:first-child,
.seam__handle span:last-child {
	color: var(--muted);
}
@media (max-width: 959px) {
	.seam__handle {
		top: auto;
		bottom: 4.75rem;
		translate: -50% 0;
	}
	.seam.is-right .seam__handle {
		translate: -100% 0;
	}
	.seam.is-left .seam__handle {
		translate: 0 0;
	}
}
.seam__grip {
	font-size: 0.9rem;
}
.rendered__failed {
	position: fixed;
	left: var(--gutter);
	bottom: 2rem;
	max-width: 24rem;
}

.source {
	position: fixed;
	z-index: 30;
	right: var(--gutter);
	bottom: 1.25rem;
	display: flex;
	flex-direction: column-reverse;
	align-items: flex-end;
	gap: 0.6rem;
}
.source__toggle {
	display: inline-flex;
	align-items: baseline;
	gap: 0.5rem;
	padding: 0.4rem 0.65rem;
	background: var(--bg);
	border: 1px solid var(--rule);
	color: var(--fg);
}
.source__seed {
	font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
	font-size: 1rem;
	line-height: 1;
}
.source__panel {
	display: grid;
	gap: 0.7rem;
	width: min(23rem, calc(100vw - 2rem));
	padding: 0.9rem;
	background: var(--bg);
	border: 1px solid var(--rule);
	box-shadow: 0 18px 40px -26px color-mix(in srgb, var(--fg) 50%, transparent);
}
.source__modes {
	display: flex;
	flex-wrap: wrap;
	gap: 0.25rem;
}
.source__mode {
	padding: 0.25rem 0.45rem;
	border: 1px solid transparent;
	color: var(--muted);
}
.source__mode[aria-checked="true"],
.source__mode[aria-pressed="true"] {
	color: var(--fg);
	border-color: var(--fg);
}
.source__note {
	color: var(--muted);
	font-style: italic;
	min-height: 3em;
}
.source__control {
	display: grid;
	grid-template-columns: 4.5rem 1fr 4.5rem;
	align-items: center;
	gap: 0.6rem;
}
.source__control input {
	width: 100%;
	accent-color: var(--fg);
}
.source__value {
	text-align: right;
	font-variant-numeric: tabular-nums;
}
.source__stats {
	line-height: 1.6;
}
.source__reset {
	justify-self: start;
	padding: 0.2rem 0;
	background: linear-gradient(currentColor, currentColor) no-repeat 0 90% / 100% 1px;
}
</style>
