<script setup lang="ts">
const { data: posts } = await useAsyncData("writing-all", () => queryCollection("writings").order("createdAt", "DESC").all());

const description = "Writing on frontend engineering, tools and the things I’m learning.";
useSeoMeta({ title: "Writing, Abdullahi Odesanmi", description, ogTitle: "Writing, Abdullahi Odesanmi", ogDescription: description });
defineOgImage(
	"Index",
	{ title: "Writing", description, path: "/writings", items: posts.value?.map((post) => post.title) ?? [] },
	{ alt: "Writing by Abdullahi Odesanmi, post titles written in vertical columns" }
);
</script>

<template>
	<main id="main" class="wrap">
		<header class="intro">
			<h1 class="intro__title">Writing</h1>
			<p class="intro__lede muted">{{ description }}</p>
		</header>

		<ol class="posts">
			<li v-for="post in posts" :key="post.slug">
				<NuxtLink :to="`/writings/${post.slug}`" class="post">
					<span class="post__meta mono muted">{{ formatMonthYear(post.createdAt) }} · {{ post.readTime }} min</span>
					<span class="post__title">{{ post.title }}</span>
					<span class="post__brief muted">{{ post.description }}</span>
				</NuxtLink>
			</li>
		</ol>
	</main>
</template>

<style scoped>
.intro {
	padding-block: clamp(3rem, 10vw, 7rem) clamp(2.5rem, 6vw, 4rem);
}
.intro__title {
	font-weight: 300;
	font-size: clamp(3.25rem, 9vw, 7rem);
	line-height: 0.95;
	letter-spacing: -0.035em;
}
.intro__lede {
	max-width: 30rem;
	margin-top: 1.25rem;
}
.posts {
	border-top: 1px solid var(--rule);
	padding-bottom: clamp(4rem, 10vw, 7rem);
}
.post {
	display: grid;
	gap: 0.4rem;
	padding-block: clamp(1.5rem, 4vw, 2.25rem);
	border-bottom: 1px solid var(--rule);
	transition: opacity 350ms ease;
}
.post__title {
	font-size: clamp(1.625rem, 3.5vw, 2.25rem);
	line-height: 1.15;
	letter-spacing: -0.015em;
	text-wrap: balance;
}
.post__brief {
	max-width: 38rem;
	font-size: 1rem;
	text-wrap: pretty;
}
@media (hover: hover) {
	.posts:has(.post:hover) .post:not(:hover) {
		opacity: 0.32;
	}
	.post:hover .post__title {
		font-style: italic;
	}
}
@media (min-width: 52rem) {
	.post {
		grid-template-columns: var(--margin) minmax(0, 1fr);
		column-gap: 0;
	}
	.post__meta {
		grid-row: span 2;
		padding-top: 0.6rem;
	}
}
</style>
