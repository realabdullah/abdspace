<script setup lang="ts">
// The home page as a printed page: name on the left, 頑張る written down the right edge.
withDefaults(defineProps<{ kicker?: string; intro?: string }>(), {
	kicker: "frontend engineer",
	intro: "I make interfaces for the web and care about the small things: how it moves, how it reads, how it feels to use.",
});
</script>

<template>
	<div style="display: flex; position: relative; width: 100%; height: 100%; background: #f4f3ef; color: #141413; font-family: Newsreader">
		<div style="display: flex; flex-direction: column; justify-content: space-between; width: 100%; height: 100%; padding: 60px 64px 58px">
			<div style="display: flex; font-family: IBM Plex Mono; font-size: 20px; color: #6b6a65">{{ kicker }}</div>
			<div style="display: flex; flex-direction: column; margin-top: -24px">
				<div style="display: flex; font-size: 168px; font-weight: 300; line-height: 0.9; letter-spacing: -6px">Abdullahi</div>
				<div style="display: flex; font-size: 168px; font-weight: 300; font-style: italic; line-height: 0.92; letter-spacing: -6px">Odesanmi</div>
			</div>
			<div style="display: flex; width: 700px; font-size: 27px; font-weight: 300; line-height: 1.4; color: #141413">{{ intro }}</div>
		</div>

		<!-- Gloss first in the source, but it reads after the kanji: vertical columns run right to left. -->
		<div
			style="
				display: flex;
				position: absolute;
				top: 300px;
				left: 765px;
				width: 420px;
				height: 24px;
				transform: rotate(90deg);
				font-family: IBM Plex Mono;
				font-size: 17px;
				color: #6b6a65;
				white-space: nowrap;
			"
		>
			<span style="font-style: italic">ganbaru</span><span>: to hold on, and do your best</span>
		</div>
		<div style="display: flex; flex-direction: column; position: absolute; top: 74px; right: 64px; font-family: Shippori Mincho B1; font-weight: 800; font-size: 136px; line-height: 1.06">
			<span>頑</span><span>張</span><span>る</span>
		</div>
	</div>
</template>
