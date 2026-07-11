<script setup lang="ts">
const { data: page } = await useAsyncData("blog-page", () => queryCollection("blog").path("/blog").first());
const { data: posts } = await useAsyncData("blog-posts", () => queryCollection("blog").order("createdAt", "DESC").where("slug", "IS NOT NULL", "/blog").all());
useSeoMeta({ title: page.value?.title || "Notes — Abdullahi Odesanmi", description: page.value?.description || "Notes on building digital products." });
defineOgImage("Portfolio", {
	title: page.value?.title || "Notes & observations",
	description: page.value?.description || "Writing on frontend engineering, tools, experiments and what I’m learning.",
	section: "Journal",
});
</script>

<template>
	<div class="mx-auto min-h-screen max-w-[1440px] px-6 sm:px-10 lg:px-20">
		<header class="border-ink/15 flex h-20 items-center justify-between border-b font-mono text-[10px] tracking-[0.12em] uppercase">
			<NuxtLink to="/" class="hover:text-coral transition-colors">← Index</NuxtLink><span class="text-stone-500">Notes / {{ posts?.length || 0 }} essays</span>
		</header>
		<main class="py-20 sm:py-28">
			<div class="border-ink grid gap-12 border-t pt-4 lg:grid-cols-[1fr_2fr]">
				<p class="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">(04) / Journal</p>
				<div>
					<h1 class="text-[clamp(3.5rem,9vw,9rem)] leading-[0.86] font-medium tracking-[-0.095em]">Notes &<br /><em class="text-coral font-serif font-normal">observations.</em></h1>
					<p class="mt-10 max-w-xl text-base leading-relaxed text-stone-500">Short writing on frontend engineering, tools, experiments and the things I’m learning along the way.</p>
				</div>
			</div>
			<ol class="border-ink/15 mt-28 border-t">
				<li v-for="(post, index) in posts" :key="String(post.slug)" class="group border-ink/15 grid gap-6 border-b py-10 sm:grid-cols-[56px_1fr_160px] sm:items-start sm:gap-8 sm:py-14">
					<span class="font-mono text-[10px] text-stone-500">{{ String(index + 1).padStart(2, "0") }}</span>
					<div>
						<NuxtLink :to="post.path" class="group-hover:text-coral text-3xl tracking-[-0.07em] transition-colors sm:text-5xl">{{ post.title }}</NuxtLink>
						<p class="mt-4 max-w-2xl text-sm leading-relaxed text-stone-500">{{ post.brief }}</p>
					</div>
					<div class="font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase sm:pt-2">
						<ClientOnly>{{ formatDate(post.createdAt) }}</ClientOnly
						><NuxtLink :to="post.path" class="text-coral mt-4 block">Read · {{ post.readTime }} min ↗</NuxtLink>
					</div>
				</li>
			</ol>
		</main>
		<footer class="border-ink/15 flex min-h-20 items-center justify-between border-t py-5 font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase">
			<NuxtLink to="/">Abdullahi Odesanmi</NuxtLink><NuxtLink to="/projects">Work ↗</NuxtLink>
		</footer>
	</div>
</template>
