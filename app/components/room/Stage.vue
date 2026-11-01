<script setup lang="ts">
// Holds whichever room you're in. Each room brings its own layout; the stage only keeps the door and 明 in reach.
const { current, meta } = useDirection();
const { data: content } = await useRoomContent();

useSeoMeta({ title: () => `Abdullahi Odesanmi, frontend engineer · ${meta.value.name}` });
</script>

<template>
	<div class="stage" :data-room="current">
		<a href="#room" class="skip mono">skip to content</a>
		<div class="stage__glyphs">
			<DirectionSwitcher />
			<ThemeToggle />
		</div>
		<main id="room" class="stage__room">
			<LazyRoomTension v-if="current === 'tension'" :content="content" />
			<LazyRoomScore v-else-if="current === 'score'" :content="content" />
			<LazyRoomJoinery v-else-if="current === 'joinery'" :content="content" />
		</main>
	</div>
</template>

<style scoped>
.stage {
	position: relative;
	min-height: 100svh;
}
.stage__glyphs {
	position: fixed;
	top: 1.4rem;
	right: var(--gutter);
	z-index: 40;
	display: flex;
	align-items: center;
	gap: 1.25rem;
	padding: 0.5rem;
}
.skip {
	position: fixed;
	z-index: 60;
	left: var(--gutter);
	top: 0.5rem;
	padding: 0.5rem 0.75rem;
	background: var(--fg);
	color: var(--bg);
	transform: translateY(-200%);
}
.skip:focus-visible {
	transform: none;
}
</style>
