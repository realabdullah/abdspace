<script lang="ts" setup>
const isCurrentlyPlaying = ref(false);
const playingData = ref({
	title: "",
	link: "",
	cover_art: "",
	l_cover_art: "",
	artists: "",
});

const getCurrentlyPlaying = async () => {
	const { data } = await useFetch("/api/playing");
	if (data.value) {
		isCurrentlyPlaying.value = data.value.isPlaying;
		if (isCurrentlyPlaying.value) playingData.value = data.value.data;
	}
};

await getCurrentlyPlaying();
</script>

<template>
	<TheHeader :is-currently-playing="isCurrentlyPlaying" :playing-data="playingData" />
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
	<TheFooter />
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
					width: 2.3rem;
					height: 2.3rem;
					top: 48%;
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
