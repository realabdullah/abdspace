<script lang="ts" setup>
const { data: home } = await useAsyncData("projectsPage", () => queryCollection("projectsPage").first());

const { data: projects } = await useAsyncData("projects", () => {
	return queryCollection("projects").order("created_at", "DESC").all();
});

useSeoMeta({ title: home.value?.title, description: home.value?.description });
</script>

<template>
	<div class="container mx-auto max-w-4xl px-4 py-16 font-mono md:py-24">
		<header class="mb-16 md:mb-24">
			<div class="mb-8 flex items-center justify-between">
				<h1 class="text-eerie_black-100 dark:text-french_gray-900 text-2xl font-normal tracking-tight">{{ home?.header || "Projects_" }}</h1>
				<NuxtLink :to="home?.nav?.link || '/'" class="text-eerie_black-100 dark:text-french_gray-900 text-sm hover:underline"> {{ home?.nav?.text || "Back to /" }} </NuxtLink>
			</div>
			<p v-if="home?.subheader" class="text-french_gray-300 max-w-2xl border-l-2 border-gray-400 pl-4">{{ home?.subheader }}</p>
		</header>

		<div class="space-y-16">
			<div v-for="(project, index) in projects" :key="index" class="group">
				<div class="flex flex-col space-y-2">
					<div class="flex items-baseline">
						<span class="text-french_gray-300 w-8 text-xs">{{ String(index + 1).padStart(2, "0") }}</span>
						<h2 class="text-eerie_black-100 dark:text-french_gray-900 text-xl font-medium">{{ project.title }}</h2>
					</div>

					<div class="pl-8">
						<p class="text-french_gray-300 mb-4 text-sm">{{ project.description }}</p>

						<div class="text-french_gray-400 mb-4 font-mono text-xs">{{ `[ ${project.tags.join(" | ")} ]` }}</div>

						<div class="flex gap-6">
							<NuxtLink v-if="project.live_url" :to="project.live_url" target="_blank" class="text-eerie_black-100 dark:text-french_gray-900 flex items-center text-sm hover:underline">
								<Icon name="hugeicons:link-square-01" :size="16" class="mr-1" />
								<span class="font-mono">view_live</span>
							</NuxtLink>
							<NuxtLink
								v-if="project.github_url"
								:to="project.github_url"
								target="_blank"
								class="text-eerie_black-100 dark:text-french_gray-900 flex items-center text-sm hover:underline"
							>
								<Icon name="hugeicons:github" :size="16" class="mr-1" />
								<span class="font-mono">source_code</span>
							</NuxtLink>
						</div>
					</div>
				</div>
				<div class="border-french_gray-700 dark:border-french_gray-300 mt-6 border-t border-dashed pt-6"></div>
			</div>
		</div>
	</div>
</template>
