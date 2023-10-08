<script lang="ts" setup>
const isCurrentlyPlaying = ref(false);
const playingData = ref({
	title: "",
	link: "",
	cover_art: "",
});

const getCurrentlyPlaying = async () => {
	const response = await fetch("/api/playing");
	const data = await response.json();
	isCurrentlyPlaying.value = data.isPlaying;
	if (isCurrentlyPlaying.value) playingData.value = data.data;
};

const navs = [
	{ name: "Work", route: "work" },
	{ name: "About", route: "about" },
	{ name: "Blog", route: "blog" },
	{ name: "Contact", route: "contact" },
];

onMounted(async () => {
	await getCurrentlyPlaying();
});
</script>

<template>
	<header class="header d-flex items-center content-between">
		<NuxtLink to="/" class="col-text">
			<IconsLogo />
		</NuxtLink>

		<div class="listening">
            <img v-if="isCurrentlyPlaying" :src="playingData.cover_art" alt="cover" class="cover_art">
			<IconsSpotify v-else />
			<span v-if="isCurrentlyPlaying" class="text-five col-text">
				Listening to
				<a :href="playingData.link" target="_blank" rel="noopener noreferrer" class="col-text">
					<strong>{{ playingData.title }}</strong>
				</a>
			</span>
			<span v-else class="text-five col-text">Not listening atm 🫣</span>
		</div>
	</header>
</template>

<style lang="scss" scoped>
.header {
	padding: 10rem 3rem;
	max-width: 120rem;
	margin: 0 auto;
	gap: 2rem;

	@media screen and (max-width: 768px) {
		padding: 5rem 3rem;
	}

	.listening {
		display: flex;
		align-items: center;
		gap: 1rem;

        img {
            @include sizing(2rem, 2rem);
        }
	}
}
</style>
