<script lang="ts" setup>
const slug = computed(() => useRoute().params.slug as string);
const { data: blog } = await useAsyncData(slug.value, () => queryCollection("blog").where("slug", "=", slug.value).first());

useSeoMeta({
	title: blog.value?.title,
	description: blog.value?.brief,
	ogTitle: blog.value?.title,
	ogDescription: blog.value?.brief,
});
</script>

<!-- overflow-x-hidden overflow-y-auto  -->
<template>
	<main class="h-dvh px-4 pt-8">
		<div class="container mx-auto">
			<h1 class="text-eerie_black-100 dark:text-french_gray-900 pb-24 text-2xl font-normal tracking-tight">abd's blog</h1>
			<article class="mx-auto max-w-3xl pb-32">
				<ClientOnly>
					<div class="text-french_gray-300 mb-2 text-xs">{{ formatDate(blog?.createdAt) }}</div>
				</ClientOnly>
				<h1 class="text-eerie_black-100 dark:text-french_gray-900 text-4xl">{{ blog?.title }}</h1>
				<div class="text-french_gray-400 mt-4 flex items-center text-xs">
					<span>By Abdullahi Odesanmi</span>
					<span class="mx-2">•</span>
					<span>{{ blog?.readTime }} min read</span>
				</div>

				<div class="text-eerie_black-100 dark:text-french_gray-900 [&_a]:text-french_gray-300 mt-12 space-y-6 leading-relaxed [&_a]:underline [&_p]:py-4">
					<ContentRenderer v-if="blog?.body" :value="blog?.body" />
					<div v-else>
						<p>No content found</p>
					</div>
				</div>
			</article>
		</div>

		<div class="bg-french_gray-900 dark:bg-eerie_black-100 border-french_gray-700 dark:border-french_gray-300 fixed right-0 bottom-0 left-0 mx-auto border-t p-4 md:px-0 md:py-8">
			<div class="mx-auto max-w-2xl">
				<NuxtLink to="/blog" class="border-french_gray-700 dark:border-french_gray-300 text-french_gray-300 border-b pb-px text-xs tracking-widest uppercase hover:border-stone-800">
					← Back to all articles
				</NuxtLink>
			</div>
		</div>
	</main>
</template>
