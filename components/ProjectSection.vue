<script lang="ts" setup>
const client = useSupabaseClient();

const { data: projects } = await useAsyncData<IProject[]>("projects", async () => {
	const { data, error } = await client.from("projects").select("*");
	if (error) throw error;
	return data;
});
</script>

<template>
	<section class="projects d-grid items-start content-between">
		<h1 class="projects__header col-text weight-500 text-one position-sticky">Projects.</h1>
		<ul class="projects__content d-flex flex-column items-start">
			<UICard v-for="(project, index) in projects" :key="index">
				<li class="projects__content-item w-full h-auto">
					<div class="details">
						<h3 class="title text-three col-text">{{ project.title }}</h3>
						<p class="desc text-five col-text mt-6">{{ project.description }}</p>
						<span class="text-five col-text mt-10 weight-500 d-flex flex-wrap items-center gap-2">
							Tools/Skills:
							<span v-for="(tag, idx) in project.tags" :key="idx" class="weight-400">{{ tag + (idx !==
								project.tags.length - 1 ? "," : ".") }}</span>
						</span>
						<div v-if="project.live_url || project.github_url"
							class="links d-flex items-center gap-5 mt-10">
							<a v-if="project.live_url" :href="project.live_url" target="_blank"
								class="link text-six col-text">View Live</a>
							<a v-if="project.github_url" :href="project.github_url" target="_blank"
								class="link text-six col-text">View Source</a>
						</div>
					</div>
				</li>
			</UICard>
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

			@media screen and (max-width: 900px) {
				max-width: 100%;
				padding: 1.5rem;
			}
		}
	}
}
</style>
