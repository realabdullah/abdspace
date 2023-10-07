<script lang="ts" setup></script>

<template>
	<main class="container">
		<section class="container__intro d-flex items-end content-between">
			<h1 class="col-text weight-500 text-one">
				Hello, I’m Abdullahi
				<span class="position-relative">
					O
					<img class="avatar position-absolute" src="@/assets/download.jpeg" alt="abd" />
				</span>
				.
			</h1>
			<p class="col-text weight-400 text-two text-right">An experienced Frontend Engineer with passion for building beautiful and functional user interfaces.</p>
		</section>

		<AboutSection />
		<WorkExperience />
		<ProjectSection />
	</main>
</template>

<style lang="scss" scoped>
.container {
	padding: 10rem 3rem;
	max-width: 120rem;
	margin: 0 auto;

	&__intro {
		padding-bottom: 10rem;
		gap: 2rem;

		@media screen and (max-width: 1088px) {
			flex-direction: column;
			align-items: flex-start;
			padding-bottom: 5rem;
		}

		h1 {
			max-width: 45rem;

			@media screen and (max-width: 1088px) {
				max-width: 100%;
				text-align: left;
			}

			span {
				.avatar {
					width: 2.7rem;
					height: 2.7rem;
					top: 50%;
					left: 42%;
					transform: translate(-50%, -50%);
					border-radius: 50%;

					@media screen and (min-width: 457px) and (max-width: 472px) {
						width: 2.5rem;
						height: 2.5rem;
						top: 30%;
						left: 0;
						transform: translate(25%, -55%);
					}

					@media screen and (min-width: 283px) and (max-width: 298px) {
						width: 2.5rem;
						height: 2.5rem;
						top: 30%;
						left: 0;
						transform: translate(25%, -55%);
					}
				}
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
}
</style>
