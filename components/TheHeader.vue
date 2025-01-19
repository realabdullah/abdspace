<script lang="ts" setup>
defineProps<{
	isCurrentlyPlaying: boolean;
	playingData: {
		title: string;
		link: string;
		cover_art: string;
		l_cover_art: string;
		artists: string;
	};
}>();

const isModalOpen = ref(false);

const navs = [
	{ name: "Work", route: "work" },
	{ name: "About", route: "about" },
	{ name: "Blog", route: "blog" },
	{ name: "Contact", route: "contact" },
];
</script>

<template>
	<header class="header d-flex items-center content-between">
		<NuxtLink to="/" class="col-text">
			<IconsLogo />
		</NuxtLink>

		<div class="listening col-text position-relative">
			<template v-if="isCurrentlyPlaying">
				<img :src="playingData.cover_art" alt="cover" class="cover_art" />
				<span class="text-five col-text">
					Listening to
					<button class="bg-transparent col-text cursor-pointer" @click="isModalOpen = !isModalOpen">
						<strong>{{ playingData.title }}</strong>
					</button>
				</span>
			</template>
			<template v-else>
				<IconsSpotify />
				<span class="text-five col-text">Not listening atm 🫣</span>
			</template>

			<UICard v-show="isModalOpen" class="playing__modal position-absolute z-2">
				<div class="playing__modal-content d-flex items-center gap-6 w-auto h-auto">
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
			</UICard>
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
	position: absolute !important;
	top: 4rem;
	right: 0;
	opacity: 0;
	animation: ellastic 1s ease-out forwards 0.15s;

	&-content {
		padding: 1rem;
		padding-right: 3rem;

		img {
			@include sizing(5rem, 5rem);
			object-fit: cover;
			border-radius: 0.5rem;
			box-shadow: var(--box-shadow);
		}

		// &::after {
		// 	content: "";
		// 	background-color: var(--main-color);
		// 	box-shadow: var(--box-shadow);
		// 	@include sizing(2rem, 2rem);
		// 	position: absolute;
		// 	right: 0.35rem;
		// 	top: -0.8rem;
		// 	transform: rotate(45deg);
		// 	z-index: -1;
		// }

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
