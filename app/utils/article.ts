// Minimark nodes: a string, or [tag, props, ...children].
type MinimarkNode = string | [string, Record<string, unknown>, ...MinimarkNode[]];

export interface Section {
	id: string;
	title: string;
	level: number;
}

const textOf = (node: MinimarkNode): string =>
	typeof node === "string"
		? node
		: node
				.slice(2)
				.map((child) => textOf(child as MinimarkNode))
				.join("");

const slugify = (text: string) =>
	text
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-");

/**
 * Some posts mark sections with a paragraph that is entirely bold rather than a heading.
 * Promote those to real h2s so they can be styled, linked and listed like any other section.
 */
export const shapeArticle = (body: { type: string; value: MinimarkNode[] }) => {
	const used = new Map<string, number>();
	const uniqueId = (text: string) => {
		const base = slugify(text) || "section";
		const count = used.get(base) ?? 0;
		used.set(base, count + 1);
		return count ? `${base}-${count + 1}` : base;
	};

	const sections: Section[] = [];
	const value = body.value.map((node) => {
		if (typeof node === "string") return node;
		const [tag, props, ...children] = node;
		const onlyBold = tag === "p" && children.length === 1 && Array.isArray(children[0]) && children[0][0] === "strong";
		if (onlyBold) {
			const title = textOf(children[0]!).trim();
			const id = uniqueId(title);
			sections.push({ id, title, level: 2 });
			return ["h2", { id }, title] as MinimarkNode;
		}
		if (tag === "h2" || tag === "h3") {
			const title = textOf(node).trim();
			const id = typeof props.id === "string" ? props.id : uniqueId(title);
			sections.push({ id, title, level: Number(tag[1]) });
			return [tag, { ...props, id }, ...children] as MinimarkNode;
		}
		return node;
	});

	return { body: { ...body, value }, sections };
};
