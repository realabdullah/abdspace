<script setup lang="ts">
const { data: projects } = await useAsyncData("projects-all", () => queryCollection("projects").order("date", "DESC").all());

const description = "Tools, experiments and small products I’ve built for myself, newest first.";
useSeoMeta({ title: "Projects, Abdullahi Odesanmi", description, ogTitle: "Projects, Abdullahi Odesanmi", ogDescription: description });
defineOgImage(
	"Index",
	{ title: "Projects", description, path: "/projects", items: projects.value?.map((project) => project.title) ?? [] },
	{ alt: "Projects by Abdullahi Odesanmi, their names written in vertical columns" }
);
</script>

<template>
	<main id="main" class="wrap">
		<header class="intro">
			<h1 class="intro__title">Projects</h1>
			<p class="intro__lede muted">{{ description }}</p>
		</header>
		<ProjectList v-if="projects" :projects="projects" class="list" />
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
.list {
	padding-bottom: clamp(4rem, 10vw, 7rem);
}
</style>
