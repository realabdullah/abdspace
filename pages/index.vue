<script lang="ts" setup></script>

<template>
	<section class="intro d-flex items-start content-between">
		<h1 class="col-text weight-500 text-one">Hello, I’m Abdullahi.</h1>
		<p class="col-text weight-400 text-two text-right">An experienced Frontend Engineer with passion for building beautiful and functional user interfaces.</p>
	</section>

	<AboutSection />
	<WorkExperience />
	<ProjectSection />
	<BlogCards />
</template>

<style lang="scss" scoped>
.intro {
	padding-bottom: 10rem;
	gap: 2rem;

	@media screen and (max-width: 1088px) {
		flex-direction: column;
		align-items: flex-start;
		padding-bottom: 5rem;
	}

	h1 {
		max-width: 50rem;

		@media screen and (max-width: 1088px) {
			max-width: 100%;
			text-align: left;
		}
	}

	p {
		max-width: 55rem;

		@media screen and (max-width: 1088px) {
			max-width: 100%;
			text-align: left;
		}
	}
}
</style>
