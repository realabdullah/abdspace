import type { Atlas, Face, Glyph } from "./atlas";

/** 0 ink, 1 muted, 2 faint. Colours come from the site's theme at draw time. */
export type Tone = 0 | 1 | 2;

export interface Span {
	text: string;
	face: Face;
	tone?: Tone;
	/** A link or row this text belongs to: drawn into the hit buffer, and animated together on hover. */
	hit?: number;
	/** A hairline under the words, or one that fills with the song's progress, as on the paper site. */
	underline?: boolean | "progress";
}

export interface GlyphQuad {
	/** Stable across layouts, so a letter can glide from its old place to its new one. */
	key: string;
	glyph: Glyph;
	x: number;
	y: number;
	w: number;
	h: number;
	scale: number;
	tone: Tone;
	hit: number;
	baseline: number;
}

export interface Rect {
	key: string;
	x: number;
	y: number;
	w: number;
	h: number;
	tone: Tone;
	hit: number;
	/** A rule is drawn; a box is only for the hit buffer and focus ring; progress fills with the song. */
	kind: "rule" | "box" | "progress";
}

export interface LineBox {
	x: number;
	y: number;
	w: number;
	h: number;
	baseline: number;
}

export class DrawList {
	glyphs: GlyphQuad[] = [];
	rects: Rect[] = [];
	lines: LineBox[] = [];
	height = 0;

	constructor(
		readonly atlas: Atlas,
		/** Extra letter spacing for the whole page, in em. */
		readonly tracking = 0,
		/** Line height multiplier for the whole page. */
		readonly leading = 1
	) {}

	rect(rect: Omit<Rect, "tone" | "hit"> & Partial<Pick<Rect, "tone" | "hit">>) {
		this.rects.push({ tone: 2, hit: 0, ...rect });
		this.height = Math.max(this.height, rect.y + rect.h);
	}
}

interface TextOptions {
	key: string;
	x: number;
	y: number;
	width: number;
	size: number;
	leading?: number;
	align?: "left" | "right";
	/** Letter spacing in em, on top of the page's. */
	tracking?: number;
}

interface Piece {
	text: string;
	span: Span;
	width: number;
}
type Item = { type: "word"; pieces: Piece[]; width: number } | { type: "space"; span: Span; width: number };

/** Width of a run of characters at a size, with the font's own kerning and the requested tracking. */
const measure = (atlas: Atlas, face: Face, text: string, size: number, tracking: number) => {
	const scale = size / face.base;
	let width = 0;
	let previous = "";
	for (const char of text) {
		if (previous) width += atlas.kern(face, previous, char) * scale;
		width += atlas.advance(face, char) * scale + tracking * size;
		previous = char;
	}
	return width;
};

/** Set a paragraph of styled spans: break it into lines, place every glyph, record the boxes links need. */
export const setText = (list: DrawList, spans: Span[], options: TextOptions) => {
	const { atlas } = list;
	const { key, x, y, width, size, align = "left" } = options;
	const tracking = (options.tracking ?? 0) + list.tracking;
	const lineHeight = size * (options.leading ?? 1.4) * list.leading;

	// Words can span styles ("gmail.com" then ","), so join neighbouring non-space pieces into one unbreakable word.
	const items: Item[] = [];
	for (const span of spans) {
		for (const token of span.text.split(/(\s+)/)) {
			if (!token) continue;
			if (/^\s+$/.test(token)) {
				items.push({ type: "space", span, width: measure(atlas, span.face, " ", size, tracking) });
				continue;
			}
			const piece = { text: token, span, width: measure(atlas, span.face, token, size, tracking) };
			const last = items.at(-1);
			if (last?.type === "word") {
				last.pieces.push(piece);
				last.width += piece.width;
			} else items.push({ type: "word", pieces: [piece], width: piece.width });
		}
	}

	const lines: Item[][] = [[]];
	let lineWidth = 0;
	for (const item of items) {
		const line = lines.at(-1)!;
		if (item.type === "space") {
			if (line.length) {
				line.push(item);
				lineWidth += item.width;
			}
			continue;
		}
		const trailing = line.at(-1)?.type === "space" ? line.at(-1)!.width : 0;
		if (line.length && lineWidth - trailing + item.width > width) {
			if (line.at(-1)?.type === "space") line.pop();
			lines.push([item]);
			lineWidth = item.width;
		} else {
			line.push(item);
			lineWidth += item.width;
		}
	}
	const lastLine = lines.at(-1)!;
	if (lastLine.at(-1)?.type === "space") lastLine.pop();

	let index = 0;
	let widest = 0;
	const hitBoxes = new Map<number, { x0: number; x1: number; line: number }>();
	lines.forEach((line, row) => {
		const total = line.reduce((sum, item) => sum + item.width, 0);
		widest = Math.max(widest, total);
		const top = y + row * lineHeight;
		const baseline = top + (lineHeight - size) / 2 + size * 0.8;
		list.lines.push({ x: align === "right" ? x + width - total : x, y: top, w: total, h: lineHeight, baseline });
		let pen = align === "right" ? x + width - total : x;

		const flushBoxes = () => {
			for (const [hit, box] of hitBoxes) list.rect({ key: `${key}:hit${hit}:${box.line}`, x: box.x0, y: top, w: box.x1 - box.x0, h: lineHeight, hit, kind: "box" });
			hitBoxes.clear();
		};

		for (const item of line) {
			const pieces = item.type === "word" ? item.pieces : [{ text: " ", span: item.span, width: item.width }];
			for (const piece of pieces) {
				const { face, tone = 0, hit = 0, underline } = piece.span;
				const scale = size / face.base;
				const start = pen;
				let previous = "";
				for (const char of piece.text) {
					if (previous) pen += atlas.kern(face, previous, char) * scale;
					const glyph = atlas.get(face, char);
					if (glyph) {
						list.glyphs.push({
							key: `${key}:${index}`,
							glyph,
							x: pen + glyph.left * scale,
							y: baseline - glyph.top * scale,
							w: glyph.w * scale,
							h: glyph.h * scale,
							scale,
							tone,
							hit,
							baseline,
						});
					}
					pen += atlas.advance(face, char) * scale + tracking * size;
					previous = char;
					index++;
				}
				if (hit && item.type === "word") {
					const box = hitBoxes.get(hit);
					if (box) box.x1 = pen;
					else hitBoxes.set(hit, { x0: start, x1: pen, line: row });
				}
				if (underline && item.type === "word") {
					const rule = { x: start, y: baseline + size * 0.16, w: pen - start, h: Math.max(1, size * 0.05), hit };
					if (underline === "progress") {
						list.rect({ ...rule, key: `${key}:u${index}`, tone: 2, kind: "rule" });
						list.rect({ ...rule, key: `${key}:p${index}`, tone: 0, kind: "progress" });
					} else list.rect({ ...rule, key: `${key}:u${index}`, tone, kind: "rule" });
				}
			}
		}
		flushBoxes();
	});

	const height = lines.length * lineHeight;
	list.height = Math.max(list.height, y + height);
	return { height, width: widest, lines: lines.length, lineHeight };
};

/** Top-to-bottom, one character under the next, the way 頑張る is written on the paper site. */
export const setVertical = (list: DrawList, text: string, face: Face, options: { key: string; x: number; y: number; size: number; tone?: Tone }) => {
	const { atlas } = list;
	const scale = options.size / face.base;
	let top = options.y;
	[...text].forEach((char, i) => {
		const glyph = atlas.get(face, char);
		if (glyph) {
			const baseline = top + options.size * 0.88;
			const centre = options.x - (glyph.advance * scale) / 2;
			list.glyphs.push({
				key: `${options.key}:${i}`,
				glyph,
				x: centre + glyph.left * scale,
				y: baseline - glyph.top * scale,
				w: glyph.w * scale,
				h: glyph.h * scale,
				scale,
				tone: options.tone ?? 0,
				hit: 0,
				baseline,
			});
		}
		top += options.size * 1.08;
	});
	list.height = Math.max(list.height, top);
	return top - options.y;
};

/** The size at which a line of text exactly fills a width. */
export const fitSize = (atlas: Atlas, face: Face, text: string, width: number) => (width / Math.max(1, measure(atlas, face, text, face.base, 0))) * face.base;
