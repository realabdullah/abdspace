/**
 * The DOM's own words, measured once and redrawn into a 2D canvas at any scale.
 * Text stays real in the page (selectable, read aloud, indexable); this only copies its paint.
 */

export interface Word {
	text: string;
	/** Left edge and baseline, in page coordinates. */
	x: number;
	y: number;
	width: number;
	height: number;
	font: string;
	color: string;
	spacing: number;
	underline: boolean;
	link: HTMLAnchorElement | null;
}

export const measureWords = (container: HTMLElement, ctx: CanvasRenderingContext2D): Word[] => {
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
		const link = el.closest("a");
		for (const match of node.data.matchAll(/\S+/g)) {
			range.setStart(node, match.index);
			range.setEnd(node, match.index + match[0].length);
			const rect = range.getClientRects()[0];
			if (!rect || rect.width === 0) continue;
			const metrics = ctx.measureText(match[0]);
			const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
			const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
			const baseline = rect.top + (rect.height - (ascent + descent)) / 2 + ascent;
			words.push({
				text: match[0],
				x: rect.left + scrollX,
				y: baseline + scrollY,
				width: rect.width,
				height: rect.height,
				font,
				color: style.color,
				spacing: Number.parseFloat(style.letterSpacing) || 0,
				underline: Boolean(link),
				link,
			});
		}
	}
	return words;
};

interface DrawOptions {
	/** Page coordinates of the top-left corner of the canvas, before scaling. */
	originX: number;
	originY: number;
	/** CSS px of output per CSS px of page. */
	scale: number;
	dpr: number;
	width: number;
	height: number;
	/** Words whose link is this one are drawn heavier. */
	emphasis?: HTMLAnchorElement | null;
}

export const drawWords = (ctx: CanvasRenderingContext2D, words: Word[], { originX, originY, scale, dpr, width, height, emphasis }: DrawOptions) => {
	ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -originX * dpr * scale, -originY * dpr * scale);
	ctx.textBaseline = "alphabetic";
	const right = originX + width / scale;
	const bottom = originY + height / scale;
	const spaced = "letterSpacing" in ctx;
	for (const word of words) {
		if (word.x > right || word.x + word.width < originX || word.y - word.height > bottom || word.y + word.height < originY) continue;
		ctx.font = word.font;
		ctx.fillStyle = word.color;
		if (spaced) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${word.spacing}px`;
		ctx.fillText(word.text, word.x, word.y);
		// About one output pixel, two for the link being pointed at.
		if (word.underline) ctx.fillRect(word.x, word.y + word.height * 0.16, word.width, (word.link === emphasis ? 2 : 1) / scale);
	}
};
