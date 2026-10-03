<script setup lang="ts">
// A post as its first page. The right margin carries the same hairline gauge the article uses for reading time.
const props = withDefaults(defineProps<{ title?: string; description?: string; date?: string; minutes?: number }>(), {
	title: "Writing",
	description: "",
	date: "",
	minutes: 0,
});

// Short titles get room to be large; long ones step down so they stay within three lines.
const titleStyle = computed(() => {
	const length = props.title.length;
	const size = length <= 28 ? 104 : length <= 52 ? 84 : 68;
	return { fontSize: `${size}px`, letterSpacing: `${-size * 0.03}px` };
});

// Two lines at most; cut at a word, never mid-word.
const lede = computed(() => {
	const text = props.description.trim();
	return text.length <= 150 ? text : `${text.slice(0, 150).replace(/\s+\S*$/, "")}…`;
});
</script>

<template>
	<div style="display: flex; position: relative; width: 100%; height: 100%; background: #f4f3ef; color: #141413; font-family: Newsreader">
		<div style="display: flex; flex-direction: column; justify-content: space-between; width: 1010px; height: 100%; padding: 60px 0 58px 64px">
			<div style="display: flex; justify-content: space-between; font-family: IBM Plex Mono; font-size: 20px; color: #6b6a65">
				<span style="color: #141413">abd</span>
				<span>writing</span>
			</div>
			<div style="display: flex; flex-direction: column">
				<div style="display: flex; font-weight: 300; line-height: 1.02" :style="titleStyle">{{ title }}</div>
				<div v-if="lede" style="display: flex; margin-top: 30px; font-size: 28px; font-weight: 300; font-style: italic; line-height: 1.4; color: #6b6a65">
					{{ lede }}
				</div>
			</div>
			<div style="display: flex; font-family: IBM Plex Mono; font-size: 20px; color: #6b6a65">{{ date }}</div>
		</div>

		<div style="display: flex; position: absolute; top: 64px; left: 1100px; width: 1px; height: 502px; background: #d7d6d1" />
		<div
			v-if="minutes"
			style="
				display: flex;
				position: absolute;
				top: 172px;
				left: 1004px;
				width: 240px;
				height: 24px;
				transform: rotate(90deg);
				font-family: IBM Plex Mono;
				font-size: 18px;
				color: #6b6a65;
				white-space: nowrap;
			"
		>
			{{ minutes }} min read
		</div>
	</div>
</template>
