<script setup lang="ts">
// A list page as a sheet of twelve vertical columns, the same twelve the theme switch inks in.
// Titles are written top to bottom and fill from the right, newest first; a long one takes two columns.
const props = withDefaults(defineProps<{ title?: string; description?: string; path?: string; items?: string[] }>(), {
	title: "Projects",
	description: "",
	path: "",
	items: () => [],
});

const COLUMNS = 12;
const SHEET = { right: 1136, top: 64, width: 600, height: 502 };
const column = SHEET.width / COLUMNS;
const LENGTH = SHEET.height - 24;
// Newsreader at 25px runs about 11px a character; past this a title needs a second column.
const fitsOneColumn = (text: string) => text.length * 11 <= LENGTH;

// Break at the space that leaves the two lines closest in length, so no word is stranded on its own.
const balance = (text: string) => {
	const words = text.split(" ");
	let best = [text];
	let widest = Infinity;
	for (let i = 1; i < words.length; i++) {
		const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
		const longest = Math.max(...lines.map((line) => line.length));
		if (longest < widest) [best, widest] = [lines, longest];
	}
	return best;
};

const spines = computed(() => {
	const placed: { text: string; span: number; start: number }[] = [];
	let used = 0;
	for (const text of props.items) {
		const span = fitsOneColumn(text) ? 1 : 2;
		if (used + span > COLUMNS) break;
		placed.push({ text, span, start: used });
		used += span;
	}
	// Each box is laid out flat, then turned a quarter clockwise about its centre: its first line lands in the right-hand column.
	return placed.map(({ text, span, start }) => {
		const thickness = column * span;
		const centreX = SHEET.right - column * start - thickness / 2;
		const centreY = SHEET.top + SHEET.height / 2;
		return {
			text,
			lines: span > 1 ? balance(text) : [text],
			style: { left: `${centreX - LENGTH / 2}px`, top: `${centreY - thickness / 2}px`, width: `${LENGTH}px`, height: `${thickness}px` },
		};
	});
});

const rules = Array.from({ length: COLUMNS + 1 }, (_, i) => ({ left: `${SHEET.right - column * i}px` }));
</script>

<template>
	<div style="display: flex; position: relative; width: 100%; height: 100%; background: #f4f3ef; color: #141413; font-family: Newsreader">
		<div style="display: flex; flex-direction: column; justify-content: space-between; width: 440px; height: 100%; padding: 60px 0 58px 64px">
			<div style="display: flex; font-family: IBM Plex Mono; font-size: 20px; color: #141413">abd</div>
			<div style="display: flex; flex-direction: column">
				<div style="display: flex; font-size: 112px; font-weight: 300; line-height: 0.95; letter-spacing: -4px">{{ title }}</div>
				<div v-if="description" style="display: flex; margin-top: 28px; font-size: 26px; font-weight: 300; line-height: 1.4; color: #6b6a65">{{ description }}</div>
			</div>
			<div style="display: flex; font-family: IBM Plex Mono; font-size: 20px; color: #6b6a65">abdspace.xyz{{ path }}</div>
		</div>

		<div v-for="(rule, i) in rules" :key="i" style="display: flex; position: absolute; top: 64px; width: 1px; height: 502px; background: #d7d6d1" :style="rule" />
		<div
			v-for="spine in spines"
			:key="spine.text"
			style="display: flex; flex-direction: column; position: absolute; transform: rotate(90deg); font-size: 25px; font-weight: 300; color: #141413"
			:style="spine.style"
		>
			<div v-for="line in spine.lines" :key="line" style="display: flex; align-items: center; height: 50px; padding: 0 4px; white-space: nowrap">{{ line }}</div>
		</div>
	</div>
</template>
