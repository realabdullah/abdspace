<script lang="ts" setup>
const { data: home } = await useAsyncData("blogPage", () => queryCollection("blog").path("/blog").first());

const { data: blogs } = await useAsyncData("blogs", () => {
	return queryCollection("blog").order("createdAt", "DESC").where("slug", "IS NOT NULL", "/blog").all();
});

useSeoMeta({ title: home.value?.title, description: home.value?.description });
</script>

<template>
	<div class="container mx-auto max-w-4xl px-4 py-16 md:py-24">
		<header class="mb-16 md:mb-24">
			<div class="mb-8 flex items-center justify-between">
				<h1 class="text-eerie_black-100 dark:text-french_gray-900 text-2xl font-normal tracking-tight">{{ home?.meta?.header || "Blogs_" }}</h1>
				<NuxtLink :to="home?.meta?.nav?.link || '/'" class="text-eerie_black-100 dark:text-french_gray-900 text-sm hover:underline"> {{ home?.meta?.nav?.text || "Back to /" }} </NuxtLink>
			</div>
			<p v-if="home?.meta?.subheader" class="text-french_gray-300 max-w-2xl border-l-2 border-gray-400 pl-4">{{ home?.meta?.subheader }}</p>
		</header>

		<div class="border-french_gray-700 dark:border-french_gray-300 border-t pt-8">
			<article v-for="blog in blogs" :key="blog.slug" class="mb-16">
				<ClientOnly>
					<div class="text-french_gray-300 mb-2 text-xs">{{ formatDate(blog.createdAt) }}</div>
				</ClientOnly>
				<h2 class="text-3xl font-light">
					<NuxtLink :to="blog.path" class="text-eerie_black-100 dark:text-french_gray-900 hover:text-french_gray-300">
						{{ blog.title }}
					</NuxtLink>
				</h2>
				<p class="text-french_gray-400 mt-4 leading-relaxed">{{ blog.brief }}</p>
				<div class="mt-4 flex items-center">
					<NuxtLink :to="blog.path" class="text-french_gray-300 border-french_gray-700 dark:border-french_gray-300 border-b pb-px text-xs tracking-widest uppercase hover:border-stone-800">
						Read article
					</NuxtLink>
					<span class="text-french_gray-300 ml-4 text-xs">{{ blog.readTime }} min read</span>
				</div>
			</article>
		</div>
	</div>
</template>
