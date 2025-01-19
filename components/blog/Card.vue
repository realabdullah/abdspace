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
	<UICard>
		<article class="card w-100">
			<h4 class="card__title text-four col-text weight-500 position-relative">{{ blog.title }}</h4>
			<p class="card__brief text-five col-text mt-16 weight-400">{{ blog.brief }}</p>
			<NuxtLink :to="`/blog/${blog.id}`" class="d-block text-six col-text mt-12">Read more</NuxtLink>
		</article>
	</UICard>
</template>

<style lang="scss" scoped>
.card {
	padding: 3rem;

	@media screen and (max-width: 900px) {
		padding: 1.5rem;
	}

	&__title {
		&::after {
			content: "";
			position: absolute;
			bottom: -1rem;
			left: 0;
			@include sizing(10rem, 0.2rem);
			background-color: var(--text-color);
		}
	}
}
</style>
