<script setup lang="ts">
const cx = ref(0);
const cy = ref(0);
const cv = ref(false);

const onMove = (e: MouseEvent) => {
	cx.value = e.clientX;
	cy.value = e.clientY;
	if (!cv.value) cv.value = true;
};

onMounted(() => window.addEventListener("mousemove", onMove));
onUnmounted(() => window.removeEventListener("mousemove", onMove));
</script>

<template>
	<div aria-hidden="true" class="site-cursor" :style="{ left: cx + 'px', top: cy + 'px', opacity: cv ? 1 : 0 }" />
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>
