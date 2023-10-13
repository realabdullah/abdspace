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

let color = "#181717";

onMounted(() => {
	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
	color = mediaQuery.matches ? "#F3F3F3" : "#181717";

	mediaQuery.addEventListener("change", (e) => (color = e.matches ? "#F3F3F3" : "#181717"));
});

onBeforeUnmount(() => {
	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
	mediaQuery.removeEventListener("change", (e) => (color = e.matches ? "#F3F3F3" : "#181717"));
});

await getCurrentlyPlaying();
</script>

<template>
	<NuxtLoadingIndicator :height="4" :color="color" />
	<TheHeader :is-currently-playing="isCurrentlyPlaying" :playing-data="playingData" />
	<main class="container">
		<slot />
	</main>
	<TheFooter />
</template>

<style lang="scss" scoped>
.container {
	padding: 10rem 3rem;
	max-width: 120rem;
	margin: 0 auto;
}
</style>
