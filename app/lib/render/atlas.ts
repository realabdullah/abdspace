/**
 * A signed distance field atlas, built in the browser from the page's own webfonts.
 *
 * Each glyph is rasterised once at a base size, then turned into a distance field with an exact Euclidean
 * distance transform (Felzenszwalb & Huttenlocher), using the antialiased coverage for sub-pixel accuracy.
 * The fragment shader can then draw it sharp at any size, at any weight, and grow or shrink it on the fly.
 */

const INF = 1e20;

/** Where the edge sits in the stored field: values above it are inside the glyph. */
export const EDGE = 0.75;

export interface Face {
	key: string;
	/** Style, weight and family, e.g. `italic 250 Newsreader`. The size is added per use. */
	font: string;
	/** Rasterising size. Larger for display type, so big letters keep crisp corners. */
	base: number;
	/** Distance, in base px, that the field spans either side of the edge. */
	radius: number;
	/**
	 * Rasterise this many times larger, then average down. The edge is exact either way, but contours further
	 * from it wobble at a single resolution; display type that gets thickened live needs those to be smooth.
	 */
	oversample?: number;
}

export interface Glyph {
	face: Face;
	char: string;
	/** Atlas rectangle, px. */
	x: number;
	y: number;
	w: number;
	h: number;
	/** From the pen position on the baseline to the bitmap's top-left corner, base px. */
	left: number;
	top: number;
	advance: number;
}

const edt1d = (grid: Float64Array, offset: number, stride: number, length: number, f: Float64Array, v: Uint16Array, z: Float64Array) => {
	v[0] = 0;
	z[0] = -INF;
	z[1] = INF;
	f[0] = grid[offset]!;
	for (let q = 1, k = 0; q < length; q++) {
		f[q] = grid[offset + q * stride]!;
		const q2 = q * q;
		let s: number;
		do {
			const r = v[k]!;
			s = (f[q]! - f[r]! + q2 - r * r) / (q - r) / 2;
		} while (s <= z[k]! && --k > -1);
		k++;
		v[k] = q;
		z[k] = s;
		z[k + 1] = INF;
	}
	for (let q = 0, k = 0; q < length; q++) {
		while (z[k + 1]! < q) k++;
		const r = v[k]!;
		const qr = q - r;
		grid[offset + q * stride] = f[r]! + qr * qr;
	}
};

/** Squared distance transform in place: columns, then rows. */
const edt = (grid: Float64Array, width: number, height: number, f: Float64Array, v: Uint16Array, z: Float64Array) => {
	for (let x = 0; x < width; x++) edt1d(grid, x, width, height, f, v, z);
	for (let y = 0; y < height; y++) edt1d(grid, y * width, 1, width, f, v, z);
};

export class Atlas {
	readonly width = 2048;
	height = 0;
	data: Uint8Array = new Uint8Array(0);
	glyphs = new Map<string, Glyph>();
	/** Characters asked for but not yet in the atlas, e.g. from a song title that just started playing. */
	missing = new Map<Face, Set<string>>();
	private fields = new Map<string, { face: Face; char: string; field: Uint8Array; w: number; h: number; left: number; top: number; advance: number }>();
	private kerning = new Map<string, number>();
	private ctx: CanvasRenderingContext2D;

	constructor() {
		this.ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
	}

	static id = (face: Face, char: string) => `${face.key}\u0000${char}`;

	get(face: Face, char: string) {
		const glyph = this.glyphs.get(Atlas.id(face, char));
		if (!glyph && char.trim() !== "") {
			const set = this.missing.get(face) ?? new Set<string>();
			set.add(char);
			this.missing.set(face, set);
		}
		return glyph;
	}

	/** Kerning from the font itself: how much narrower a pair is than its two letters apart. */
	kern(face: Face, a: string, b: string) {
		const key = `${face.key}\u0000${a}${b}`;
		let value = this.kerning.get(key);
		if (value === undefined) {
			const ctx = this.ctx;
			ctx.font = fontString(face, face.base);
			value = ctx.measureText(a + b).width - ctx.measureText(a).width - ctx.measureText(b).width;
			this.kerning.set(key, value);
		}
		return value;
	}

	/** Rasterise any new characters, then pack every glyph again in shelves, tallest first. Returns how many were new. */
	build(needs: Map<Face, Set<string>> = this.missing) {
		let added = 0;
		for (const [face, chars] of needs) {
			for (const char of chars) {
				const id = Atlas.id(face, char);
				if (char.trim() === "" || this.fields.has(id)) continue;
				this.fields.set(id, { face, char, ...this.rasterise(face, char) });
				added++;
			}
		}
		this.missing = new Map();

		const all = [...this.fields.values()].sort((a, b) => b.h - a.h);
		let x = 1;
		let y = 1;
		let shelf = 0;
		const placed = all.map((item) => {
			if (x + item.w + 1 > this.width) {
				x = 1;
				y += shelf + 1;
				shelf = 0;
			}
			const at = { x, y };
			x += item.w + 1;
			shelf = Math.max(shelf, item.h);
			return { item, ...at };
		});
		this.height = 2 ** Math.ceil(Math.log2(Math.max(64, y + shelf + 1)));
		this.data = new Uint8Array(this.width * this.height);
		this.glyphs.clear();
		for (const { item, x: px, y: py } of placed) {
			for (let row = 0; row < item.h; row++) this.data.set(item.field.subarray(row * item.w, (row + 1) * item.w), (py + row) * this.width + px);
			this.glyphs.set(Atlas.id(item.face, item.char), { face: item.face, char: item.char, x: px, y: py, w: item.w, h: item.h, left: item.left, top: item.top, advance: item.advance });
		}
		return added;
	}

	advance(face: Face, char: string) {
		const glyph = this.get(face, char);
		if (glyph) return glyph.advance;
		this.ctx.font = fontString(face, face.base);
		return this.ctx.measureText(char).width;
	}

	private rasterise(face: Face, char: string) {
		const k = face.oversample ?? 1;
		const big = this.field(face, char, face.base * k, face.radius * k);
		if (k === 1) return big;
		// Box-filter the oversampled field down: each output texel is the mean of a k×k block.
		const w = Math.ceil(big.w / k);
		const h = Math.ceil(big.h / k);
		const field = new Uint8Array(w * h);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				let sum = 0;
				let count = 0;
				for (let dy = 0; dy < k; dy++) {
					for (let dx = 0; dx < k; dx++) {
						const sx = x * k + dx;
						const sy = y * k + dy;
						if (sx < big.w && sy < big.h) {
							sum += big.field[sy * big.w + sx]!;
							count++;
						}
					}
				}
				field[y * w + x] = Math.round(sum / Math.max(1, count));
			}
		}
		return { field, w, h, left: big.left / k, top: big.top / k, advance: big.advance / k };
	}

	private field(face: Face, char: string, size: number, radius: number) {
		const ctx = this.ctx;
		const pad = Math.ceil(radius) + 2;
		ctx.font = fontString(face, size);
		const m = ctx.measureText(char);
		const ascent = Math.ceil(m.actualBoundingBoxAscent);
		const descent = Math.ceil(m.actualBoundingBoxDescent);
		const left = Math.ceil(m.actualBoundingBoxLeft);
		const right = Math.ceil(m.actualBoundingBoxRight);
		const w = Math.max(1, left + right) + pad * 2;
		const h = Math.max(1, ascent + descent) + pad * 2;

		const canvas = ctx.canvas;
		if (canvas.width < w || canvas.height < h) {
			canvas.width = Math.max(canvas.width, w);
			canvas.height = Math.max(canvas.height, h);
		}
		ctx.font = fontString(face, size);
		ctx.textBaseline = "alphabetic";
		ctx.textAlign = "left";
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = "#000";
		ctx.fillText(char, pad + left, pad + ascent);
		const { data } = ctx.getImageData(0, 0, w, h);

		const area = w * h;
		const outer = new Float64Array(area);
		const inner = new Float64Array(area);
		for (let i = 0; i < area; i++) {
			const a = data[i * 4 + 3]! / 255;
			if (a === 1) {
				outer[i] = 0;
				inner[i] = INF;
			} else if (a === 0) {
				outer[i] = INF;
				inner[i] = 0;
			} else {
				// Partial coverage says how far inside the pixel the edge sits.
				const d = 0.5 - a;
				outer[i] = d > 0 ? d * d : 0;
				inner[i] = d < 0 ? d * d : 0;
			}
		}
		const longest = Math.max(w, h);
		const f = new Float64Array(longest);
		const v = new Uint16Array(longest);
		const z = new Float64Array(longest + 1);
		edt(outer, w, h, f, v, z);
		edt(inner, w, h, f, v, z);

		const field = new Uint8Array(area);
		for (let i = 0; i < area; i++) {
			const d = Math.sqrt(outer[i]!) - Math.sqrt(inner[i]!);
			field[i] = Math.max(0, Math.min(255, Math.round(255 - 255 * (d / radius + (1 - EDGE)))));
		}
		return { field, w, h, left: -(pad + left), top: pad + ascent, advance: m.width };
	}
}

export const fontString = (face: Face, size: number) => {
	const [style, weight, ...family] = face.font.split(" ");
	return `${style} ${weight} ${size}px ${family.join(" ")}`;
};
