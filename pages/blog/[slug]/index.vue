<script setup lang="ts">
const slug = computed(() => useRoute().params.slug as string);
const { data: post } = await useAsyncData(`post-${slug.value}`, () => queryCollection("blog").where("slug", "=", slug.value).first());
const canonicalUrl = computed(() => `https://abdspace.xyz/blog/${slug.value}`);
useSeoMeta({
	title: `${post.value?.title} — Abdullahi Odesanmi`,
	description: post.value?.brief,
	ogTitle: post.value?.title,
	ogDescription: post.value?.brief,
	ogType: "article",
	ogUrl: canonicalUrl,
	articlePublishedTime: post.value?.createdAt,
	twitterCard: "summary_large_image",
});
useHead({
	link: [{ rel: "canonical", href: canonicalUrl }],
	script: [
		{
			type: "application/ld+json",
			innerHTML: JSON.stringify({
				"@context": "https://schema.org",
				"@type": "BlogPosting",
				headline: post.value?.title,
				description: post.value?.brief,
				datePublished: post.value?.createdAt,
				mainEntityOfPage: canonicalUrl.value,
				author: { "@type": "Person", name: "Abdullahi Odesanmi", url: "https://abdspace.xyz" },
			}),
		},
	],
});
</script>

<template>
	<div class="mx-auto min-h-screen max-w-[1440px] px-6 sm:px-10 lg:px-20">
		<header class="border-ink/15 flex h-20 items-center justify-between border-b font-mono text-[10px] tracking-[0.12em] uppercase">
			<NuxtLink to="/blog" class="hover:text-coral transition-colors">← Notes</NuxtLink
			><NuxtLink to="/" class="text-lg font-semibold tracking-[-0.035em]">ABD<span class="text-coral ml-0.5">·</span></NuxtLink>
		</header>
		<main class="grid min-w-0 gap-12 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-20 lg:py-28">
			<aside class="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">
				<span class="block">(04) / Journal</span><span class="mt-4 block">{{ post?.readTime }} min read</span>
			</aside>
			<article class="max-w-3xl min-w-0">
				<div class="font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase">
					<ClientOnly>{{ formatDate(post?.createdAt) }}</ClientOnly>
				</div>
				<h1 class="mt-6 text-[clamp(2.65rem,7vw,7rem)] leading-[0.92] font-medium tracking-[-0.08em] break-words">{{ post?.title }}</h1>
				<p class="border-coral mt-10 border-l-2 pl-5 text-base leading-relaxed text-stone-500">{{ post?.brief }}</p>
				<div class="border-ink/15 my-14 border-t"></div>
				<div
					class="[&_a]:text-coral [&_code]:bg-ink/8 [&_pre]:!bg-ink max-w-none min-w-0 font-sans text-[15px] leading-[1.85] text-stone-700 [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.88em] [&_h2]:mt-12 [&_h2]:font-sans [&_h2]:text-3xl [&_h2]:font-medium [&_h2]:tracking-[-0.05em] [&_h3]:mt-10 [&_h3]:font-sans [&_h3]:text-2xl [&_img]:h-auto [&_img]:max-w-full [&_p]:my-6 [&_pre]:my-8 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-white/10 [&_pre]:p-5 [&_pre]:shadow-[0_16px_40px_rgba(23,23,20,0.12)] sm:[&_pre]:p-6 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[13px] [&_pre_code]:leading-6"
				>
					<ContentRenderer v-if="post?.body" :value="post.body" />
					<p v-else>No content found.</p>
				</div>
			</article>
		</main>
		<footer class="border-ink/15 flex min-h-20 items-center justify-between border-t py-5 font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase">
			<NuxtLink to="/blog">← All notes</NuxtLink><NuxtLink to="/#contact">Start a conversation ↗</NuxtLink>
		</footer>
	</div>
</template>
