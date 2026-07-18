<script setup lang="ts">
const { data: page } = await useAsyncData("projects-page", () => queryCollection("projectsPage").first());
const { data: projects } = await useAsyncData("projects", () => queryCollection("projects").order("created_at", "DESC").all());

useSeoMeta({ title: page.value?.title || "Projects — Abdullahi Odesanmi", description: page.value?.description || "A collection of digital products and experiments." });
defineOgImage("Portfolio", {
	title: page.value?.title || "Selected projects",
	description: page.value?.description || "A collection of useful systems, experiments and interfaces built with care.",
	section: "Projects",
});

const projectUrl = (project: { path?: string; stem?: string }) => {
	if (project.path?.startsWith("/")) return project.path;
	if (project.path?.startsWith("projects/")) return `/${project.path}`;
	return project.path ? `/${project.path}` : `/${project.stem}`;
};
</script>

<template>
	<div class="mx-auto min-h-screen max-w-[1440px] px-6 sm:px-10 lg:px-20">
		<header class="border-ink/15 flex h-20 items-center justify-between border-b font-mono text-[10px] tracking-[0.12em] uppercase">
			<NuxtLink to="/" class="hover:text-coral transition-colors">← Index</NuxtLink><span class="text-stone-500">Selected project / {{ projects?.length || 0 }} projects</span>
		</header>
		<main class="py-20 sm:py-28">
			<div class="border-ink grid gap-12 border-t pt-4 lg:grid-cols-[1fr_2fr]">
				<p class="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">(03) / Archive</p>
				<div>
					<h1 class="text-[clamp(3.5rem,9vw,9rem)] leading-[0.86] font-medium tracking-[-0.095em]">Things I’ve<br /><em class="text-coral font-serif font-normal">made.</em></h1>
					<p class="mt-10 max-w-xl text-base leading-relaxed text-stone-500">{{ page?.subheader || "A collection of useful systems, experiments and interfaces built with care." }}</p>
				</div>
			</div>
			<ol class="border-ink/15 mt-28 border-t">
				<li
					v-for="(project, index) in projects"
					:key="String(project.title)"
					class="group border-ink/15 grid gap-7 border-b py-10 sm:grid-cols-[56px_1.3fr_1fr_90px] sm:items-start sm:gap-8 sm:py-14"
				>
					<span class="font-mono text-[10px] text-stone-500">{{ String(index + 1).padStart(2, "0") }}</span>
					<div>
						<NuxtLink :to="projectUrl(project)" class="group-hover:text-coral text-3xl tracking-[-0.07em] transition-colors sm:text-5xl">{{ project.title }}</NuxtLink>
						<p class="mt-4 max-w-md text-sm leading-relaxed text-stone-500">{{ project.description }}</p>
					</div>
					<div class="flex flex-wrap gap-2 sm:pt-2">
						<span v-for="tag in project.tags" :key="tag" class="border-ink/15 border px-2 py-1 font-mono text-[9px] tracking-[0.08em] text-stone-500 uppercase">{{ tag }}</span>
					</div>
					<div class="text-coral flex gap-4 font-mono text-[10px] tracking-[0.1em] uppercase sm:block sm:pt-2">
						<span class="text-stone-500">{{ formatProjectDate(project.created_at) }}</span
						><a v-if="project.live_url" :href="project.live_url" target="_blank" rel="noopener noreferrer" class="ml-4 sm:mt-5 sm:ml-0 sm:block">Live ↗</a
						><a v-if="project.github_url" :href="project.github_url" target="_blank" rel="noopener noreferrer" class="ml-4 sm:mt-2 sm:ml-0 sm:block">Source ↗</a>
					</div>
				</li>
			</ol>
		</main>
		<footer class="border-ink/15 flex min-h-20 items-center justify-between border-t py-5 font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase">
			<NuxtLink to="/">Abdullahi Odesanmi</NuxtLink><NuxtLink to="/writings">Writings ↗</NuxtLink>
		</footer>
	</div>
</template>
