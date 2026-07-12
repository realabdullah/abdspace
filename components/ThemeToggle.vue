<script setup lang="ts">
const { isDark, toggleTheme } = useTheme();
const hydrated = ref(false);

onMounted(() => {
	hydrated.value = true;
});
</script>

<template>
	<button
		type="button"
		class="border-ink/15 hover:border-coral inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
		:aria-label="hydrated ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Switch color mode'"
		:title="hydrated ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Switch color mode'"
		@click="toggleTheme($event.currentTarget as HTMLElement)"
	>
		<svg v-if="hydrated && isDark" aria-hidden="true" class="text-coral h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			<circle cx="8" cy="8" r="2.5" fill="currentColor" />
			<path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M12.95 3.05l-1.42 1.42M4.47 11.53l-1.42 1.42" stroke="currentColor" stroke-linecap="round" />
		</svg>
		<svg v-else aria-hidden="true" class="text-coral h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M13.4 10.9A6.2 6.2 0 0 1 5.1 2.6 6.3 6.3 0 1 0 13.4 10.9Z" fill="currentColor" />
		</svg>
	</button>
</template>
