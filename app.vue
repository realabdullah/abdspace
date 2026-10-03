<script setup lang="ts">
const route = useRoute();
const canonicalUrl = computed(() => `https://www.abdspace.xyz${route.path === "/" ? "" : route.path}`);

useSeoMeta({
	ogSiteName: "Abdullahi Odesanmi",
	ogLocale: "en_NG",
	ogUrl: canonicalUrl,
	twitterCard: "summary_large_image",
	twitterCreator: "@_realabd",
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
				jobTitle: "Frontend Engineer",
				sameAs: ["https://github.com/realabdullah", "https://www.linkedin.com/in/abdullahiodesanmi/", "https://x.com/_realabd"],
			}),
		},
	],
});
</script>

<template>
	<div id="top">
		<a href="#main" class="skip mono">skip to content</a>
		<SiteHeader />
		<NuxtPage />
		<SiteFooter />
	</div>
</template>

<style>
.skip {
	position: absolute;
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
