<script lang="ts" setup>
const client = useSupabaseClient();

const { data: projects } = await useAsyncData<IProject[]>("projects", async () => {
	const { data, error } = await client.from("projects").select("*");
	if (error) throw error;
	return data;
});
</script>

<template>
	<section class="projects grid items-start justify-between">
		<h1 class="projects__header text-dark font-medium text-7xl leading-[-1.4px] sm:text-text-8xl sm:leading-[-1.8px] sticky">Projects.</h1>
		<ul class="projects__content flex flex-col items-start">
			<li v-for="(project, index) in projects" :key="index" class="projects__content-item w-full h-auto">
				<div class="details">
					<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-normal">
						In Progress
					</div>
					<h3 class="title text-2xl leading-[-0.5px] sm:text-text-4xl sm:leading-[-0.6px] text-dark">{{ project.title }}</h3>
					<p class="desc text-2xl sm:text-text-3xl text-dark mt-6">{{ project.description }}</p>
					<span class="text-2xl sm:text-text-3xl text-dark mt-20 font-medium flex flex-wrap items-center gap-2">
						Tools/Skills:
						<span v-for="(tag, idx) in project.tags" :key="idx" class="font-normal">{{ tag + (idx !==
							project.tags.length - 1 ? "," : ".") }}</span>
					</span>
					<div v-if="project.live_url || project.github_url" class="links flex items-center gap-5 mt-15">
						<a v-if="project.live_url" :href="project.live_url" target="_blank"
							class="link text-lg sm:text-text-2xl text-dark">View Live</a>
						<a v-if="project.github_url" :href="project.github_url" target="_blank"
							class="link text-lg sm:text-text-2xl text-dark">View Source</a>
					</div>
				</div>
			</li>
		</ul>
	</section>
</template>

<style lang="scss" scoped>
.projects {
	padding: 10rem 0;
	grid-template-columns: 1fr 1fr;

	@media screen and (max-width: 900px) {
		grid-template-columns: 1fr;
	}

	@media screen and (max-width: 600px) {
		padding: 5rem 0;
	}

	&__header {
		margin-bottom: 5rem;
		top: 5rem;

		@media screen and (max-width: 900px) {
			top: unset;
		}
	}

	&__content {
		gap: 3rem;

		&-item {
			padding: 3rem;
			max-width: 64rem;
			background-color: var(--white);

			@media screen and (max-width: 900px) {
				max-width: 100%;
			}
		}
	}
}
</style>
