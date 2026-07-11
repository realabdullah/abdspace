<script setup lang="ts">
const route = useRoute();
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

const canonicalUrl = computed(() => `https://www.abdspace.xyz${route.path === "/" ? "" : route.path}`);

useSeoMeta({
	ogSiteName: "Abdullahi Odesanmi",
	ogLocale: "en_NG",
	ogUrl: canonicalUrl,
	twitterCard: "summary_large_image",
	twitterCreator: "@realabdullah",
	robots: "index, follow, max-image-preview:large",
});

useHead({
	htmlAttrs: { lang: "en" },
	link: [
		{ rel: "canonical", href: canonicalUrl },
		{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
		{ rel: "alternate icon", href: "/favicon.ico" },
	],
	script: [
		{
			type: "application/ld+json",
			innerHTML: JSON.stringify({
				"@context": "https://schema.org",
				"@type": "Person",
				name: "Abdullahi Odesanmi",
				url: "https://www.abdspace.xyz",
				jobTitle: "Software Engineer",
				sameAs: ["https://github.com/realabdullah"],
			}),
		},
	],
});
</script>

<template>
	<div aria-hidden="true" class="site-cursor" :style="{ left: cx + 'px', top: cy + 'px', opacity: cv ? 1 : 0 }" />
	<NuxtLayout>
		<NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
	</NuxtLayout>
</template>
