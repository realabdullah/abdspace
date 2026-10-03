<script setup lang="ts">
const site = useSiteConfig();
const route = useRoute();
// One form per page, matching the sitemap: the root keeps its slash, nothing else ends in one.
const canonicalUrl = computed(() => `${site.url}${route.path.replace(/\/+$/, "") || "/"}`);

useSeoMeta({
	ogSiteName: site.name,
	ogType: "website",
	ogUrl: canonicalUrl,
	twitterCard: "summary_large_image",
	twitterSite: "@_realabd",
	twitterCreator: "@_realabd",
	robots: "index, follow, max-image-preview:large",
});

useHead({
	htmlAttrs: { lang: "en" },
	link: [{ rel: "canonical", href: canonicalUrl }],
	script: [
		{
			type: "application/ld+json",
			innerHTML: JSON.stringify({
				"@context": "https://schema.org",
				"@graph": [
					{
						"@type": "WebSite",
						"@id": `${site.url}/#website`,
						url: site.url,
						name: site.name,
						inLanguage: "en",
						publisher: { "@id": `${site.url}/#person` },
					},
					{
						"@type": "Person",
						"@id": `${site.url}/#person`,
						name: "Abdullahi Odesanmi",
						url: site.url,
						jobTitle: "Frontend engineer",
						description: site.description,
						sameAs: ["https://github.com/realabdullah", "https://www.linkedin.com/in/abdullahiodesanmi/", "https://x.com/_realabd"],
					},
				],
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
