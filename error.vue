<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();
const status = computed(() => props.error.statusCode || 500);
const missing = computed(() => status.value === 404);

useHead({ title: `${status.value}, Abdullahi Odesanmi`, meta: [{ name: "robots", content: "noindex" }] });
</script>

<template>
	<div id="top">
		<SiteHeader />
		<main id="main" class="wrap error">
			<p class="mono muted">{{ status }}</p>
			<h1 class="error__title">{{ missing ? "Nothing is written here." : "Something slipped." }}</h1>
			<p class="muted error__text">
				{{ missing ? "The page may have moved, or never existed." : "The page ran into something unexpected." }}
				<button type="button" class="link error__home" @click="clearError({ redirect: '/' })">Go back to the start.</button>
			</p>
		</main>
	</div>
</template>

<style scoped>
.error {
	min-height: 70svh;
	padding-block: clamp(4rem, 14vh, 10rem);
}
.error__title {
	margin-top: 1.5rem;
	max-width: 14ch;
	font-weight: 300;
	font-size: clamp(2.75rem, 8vw, 6rem);
	line-height: 0.98;
	letter-spacing: -0.035em;
}
.error__text {
	margin-top: 2rem;
	max-width: 30rem;
}
.error__home {
	color: var(--fg);
	font-style: italic;
}
</style>
