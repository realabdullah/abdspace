<script lang="ts" setup>
defineProps<{
	blog: {
		id: string;
		title: string;
		brief: string;
	};
}>();
</script>

<template>
	<article class="card w-full bg-white p-[4rem]">
		<h4
			class="card__title text-2xl leading-[-0.5px] sm:text-text-4xl sm:leading-[-0.6px] text-dark font-medium relative after:bg-dark after:absolute after:bottom-[-1rem] after:left-0 after:w-[10rem] after:h-[0.2rem]">
			{{ blog.title }}
		</h4>
		<p class="card__brief text-2xl sm:text-text-3xl text-dark mt-16 font-normal">{{ blog.brief }}</p>
		<NuxtLink :to="`/blog/${blog.id}`" class="block text-lg sm:text-text-2xl text-dark mt-12">Read more</NuxtLink>
	</article>
</template>
