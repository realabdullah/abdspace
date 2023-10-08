<script lang="ts" setup>
const isModalOpen = ref(false);
const isCurrentlyPlaying = ref(false);
const playingData = ref({
	title: "",
	link: "",
	cover_art: "",
	l_cover_art: "",
	artists: "",
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

		<div class="listening col-text position-relative">
			<img v-if="isCurrentlyPlaying" :src="playingData.cover_art" alt="cover" class="cover_art" />
			<IconsSpotify v-else />
			<span v-if="isCurrentlyPlaying" class="text-five col-text">
				Listening to
				<button class="bg-transparent col-text cursor-pointer" @click="isModalOpen = !isModalOpen">
					<strong>{{ playingData.title }}</strong>
				</button>
			</span>
			<span v-else class="text-five col-text">Not listening atm 🫣</span>

			<div v-show="isModalOpen" class="playing__modal position-absolute z-2 d-flex items-center gap-6 w-auto h-auto">
				<img :src="playingData.l_cover_art" alt="cover_art" />
				<div class="details d-flex flex-column gap-2">
					<a :href="playingData.link" target="_blank" class="title text-five weight-500 col-text">{{ playingData.title }}</a>
					<p class="artists text-nowrap text-five weight-400 col-text">{{ playingData.artists }}</p>
				</div>
				<div class="bar d-flex content-between ml-5">
					<span></span>
					<span></span>
					<span></span>
				</div>
			</div>
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

		.cover_art {
			@include sizing(2rem, 2rem);
		}

		button {
			@include ellipsis;
		}
	}
}

.playing__modal {
	padding: 1rem;
	padding-right: 3rem;
	box-shadow: 0 1rem 3rem rgba(#8d9097, 0.05);
	top: 4rem;
	right: 0;
	opacity: 0;
	animation: ellastic 1s ease-out forwards 0.15s;
	background-color: var(--white);
	backdrop-filter: blur(1rem);

	img {
		@include sizing(5rem, 5rem);
		object-fit: cover;
		border-radius: 0.5rem;
		box-shadow: #64646f33 0 0.7rem 2.9rem 0;
	}

	&::after {
		content: "";
		background-color: var(--white);
		@include sizing(2rem, 2rem);
		position: absolute;
		right: 0.35rem;
		top: -0.8rem;
		transform: rotate(45deg);
		z-index: 0;
	}

	.details {
		.title {
			@include ellipsis;
		}
	}

	.bar {
		@include sizing(1.3rem, 1.3rem);

		span {
			@include sizing(0.3rem, 100%);
			background-color: var(--text-color);
			border-radius: 0.3rem;
			animation: bar 2.2s ease infinite alternate;

			&:nth-of-type(2) {
				animation-delay: -2.2s;
			}

			&:nth-of-type(3) {
				animation-delay: -3.7s;
			}
		}
	}
}

@keyframes ellastic {
	0% {
		opacity: 0;
		transform: scale(1, 1);
	}
	10% {
		transform: scale(1.1, 0.9);
	}
	30% {
		transform: scale(0.9, 1.1);
	}
	50% {
		transform: scale(1.05, 0.95);
	}
	100% {
		opacity: 1;
		transform: scale(1, 1);
	}
}

@keyframes bar {
	10% {
		transform: scaleY(0.3);
	}

	30% {
		transform: scaleY(1);
	}

	60% {
		transform: scaleY(0.5);
	}

	80% {
		transform: scaleY(0.75);
	}

	100% {
		transform: scaleY(0.6);
	}
}
</style>
