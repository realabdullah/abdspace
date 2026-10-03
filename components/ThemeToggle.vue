<script setup lang="ts">
// 明 (bright) is written with 日 (sun) and 月 (moon). Light mode inks the sun, dark mode the moon.
// The halves are styled from the html.dark class, so the server render already matches.
const { isDark, hydrate, toggle } = useTheme();
const ready = ref(false);

onMounted(() => {
	hydrate();
	ready.value = true;
});

const label = computed(() => (isDark.value ? "Switch to light mode" : "Switch to dark mode"));
const hint = computed(() => `${label.value}. 明 means bright: sun 日 beside moon 月.`);
</script>

<template>
	<button type="button" class="mei" :class="{ 'is-ready': ready }" :aria-label="label" :title="hint" @click="toggle">
		<span class="mei__glyph mei__sun" aria-hidden="true">明</span>
		<span class="mei__glyph mei__moon" aria-hidden="true">明</span>
	</button>
</template>

<style scoped>
.mei {
	position: relative;
	display: inline-grid;
	place-items: center;
	width: 2.75rem;
	height: 2.75rem;
	margin: -0.5rem;
	font-family: var(--jp);
	font-weight: 500;
	font-size: 1.375rem;
	line-height: 1;
}

.mei__glyph {
	grid-area: 1 / 1;
	transition:
		opacity 600ms var(--ease-out),
		color 600ms var(--ease-out);
}

/* The left part of the glyph is 日, the right part is 月. */
.mei__sun {
	clip-path: inset(0 58% 0 0);
}
.mei__moon {
	clip-path: inset(0 0 0 42%);
	color: var(--faint);
}
:global(html.dark) .mei__sun {
	color: var(--faint);
}
:global(html.dark) .mei__moon {
	color: var(--fg);
}

/* Hovering previews the other half. */
@media (hover: hover) {
	.mei:hover .mei__sun,
	.mei:hover .mei__moon {
		color: var(--fg);
	}
}

.mei:not(.is-ready) .mei__glyph {
	transition: none;
}
</style>
