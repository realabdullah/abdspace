<script lang="ts" setup>
const isCurrentlyPlaying = ref(false);
const playingData = ref<IPlayerData>({
	title: "",
	link: "",
	cover_art: "",
	l_cover_art: "",
	artists: "",
});

const getCurrentlyPlaying = async () => {
	const { data } = await useFetch("/api/playing");
	if (data.value) {
		if (data.value.isPlaying) {
			isCurrentlyPlaying.value = data.value.isPlaying;
			playingData.value = data.value.data as IPlayerData;
		}
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
	<div class="bg-primary">
		<TheHeader :is-currently-playing="isCurrentlyPlaying" :playing-data="playingData" />
		<main class="container mx-auto my-0 max-w-[1200px] px-7 py-24">
			<NuxtPage />
		</main>
		<TheFooter />
	</div>
</template>
