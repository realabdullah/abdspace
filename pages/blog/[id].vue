<script lang="ts" setup>
import hljs from "highlight.js";
import type { IPost } from "~/types";

const config = useRuntimeConfig();
const { params } = useRoute();
const post = ref<IPost>({
	title: "",
	publishedAt: "",
	updatedAt: "",
	content: "",
	coverImage: "",
	ogImage: "",
	author: {
		name: "",
		photo: "",
	},
	readTime: "",
});

const getPost = async () => {
	const { data, error } = await useFetch("/api/post?id=" + params.id);
	if (error.value) {
		throw createError({ statusCode: 500, message: error.value.message });
	}

	if (data.value) {
		post.value = data.value as IPost;
	}
};

const highlightCode = () => {
	const preElements = document.querySelectorAll("pre");
	preElements.forEach((pre) => {
		hljs.highlightElement(pre);
	});

	const codeElements = document.querySelectorAll("code");
	codeElements.forEach((code) => {
		hljs.highlightElement(code);
	});
};

onMounted(() => {
	highlightCode();
});

await getPost();

useSeoMeta({
	title: () => post.value.title + " | Abdullahi Odesanmi — Frontend Engineer",
	ogTitle: () => post.value.title + " | Abdullahi Odesanmi — Frontend Engineer",
	description: () => post.value.content,
	ogDescription: () => post.value.content,
	ogImage: () => post.value.ogImage,
	ogUrl: () => config.public.baseUrl + "/blog/" + params.id,
	twitterImage: () => post.value.ogImage,
	twitterTitle: () => post.value.title + " | Abdullahi Odesanmi — Frontend Engineer",
	twitterDescription: () => post.value.content,
});
</script>

<template>
	<h1 class="col-text weight-500 text-one">{{ post.title }}</h1>
	<div class="content" v-html="post.content"></div>
</template>

<style lang="scss">
@import url("@/assets/css/code.css");

.content {
	padding: 10rem 0;

	p,
	a {
		font-size: 1.8rem;
		line-height: 3rem;
		margin-bottom: 2rem;
		color: var(--text-color);
	}

	img {
		width: 100%;
		height: auto;
		margin-bottom: 2rem;
	}

	pre {
		padding: 2rem;
		margin-bottom: 2rem;
		overflow: auto;
	}
}
</style>
