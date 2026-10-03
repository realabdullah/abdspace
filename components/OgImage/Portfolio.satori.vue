<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string }>(), {
	title: "Abdullahi Odesanmi",
	description: "Frontend engineer.",
});
</script>

<template>
	<div style="display: flex; width: 100%; height: 100%; padding: 72px; background: #f4f3ef; color: #141413; justify-content: space-between; font-family: Newsreader">
		<div style="display: flex; flex-direction: column; justify-content: space-between; max-width: 860px">
			<div style="display: flex; font-size: 22px; color: #6b6a65; font-family: IBM Plex Mono">abdspace.xyz</div>
			<div style="display: flex; flex-direction: column">
				<div style="display: flex; font-size: 88px; line-height: 1; letter-spacing: -2px; font-weight: 300">{{ title }}</div>
				<div style="display: flex; margin-top: 28px; font-size: 30px; color: #6b6a65">{{ description }}</div>
			</div>
		</div>
		<div style="display: flex; flex-direction: column; font-size: 92px; line-height: 1.05; font-weight: 800; font-family: Shippori Mincho B1"><span>頑</span><span>張</span><span>る</span></div>
	</div>
</template>
