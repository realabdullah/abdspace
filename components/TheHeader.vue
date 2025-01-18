<script lang="ts" setup>
import type { IPlayerData } from "~/types";

defineProps<{
	isCurrentlyPlaying: boolean;
	playingData: IPlayerData;
}>();

const isModalOpen = ref(false);
</script>

<template>
	<header class="flex items-center justify-between py-12 px-7 md:py-24 md:px-7 max-w-[1200px] mx-auto gap-5">
		<NuxtLink to="/" class="text-dark">
			<IconsLogo />
		</NuxtLink>

		<div class="text-dark relative flex items-center gap-2.5">
			<template v-if="isCurrentlyPlaying">
				<img :src="playingData.cover_art" alt="cover" class="w-5 h-5" />
				<span class="text-xs sm:text-sm text-dark">
					Listening to
					<button class="bg-transparent text-dark cursor-pointer max-w-36 overflow-hidden whitespace-nowrap text-ellipsis" @click="isModalOpen = !isModalOpen">
						<strong>{{ playingData.title }}</strong>
					</button>
				</span>
			</template>
			<template v-else>
				<IconsSpotify />
				<span class="text-xs sm:text-sm text-dark">Not listening atm 🫣</span>
			</template>

			<div
				v-show="isModalOpen"
				class="animate-ellastic p-2.5 pr-7 absolute z-50 flex items-center shadow-2xl top-10 right-0 opacity-0 bg-white backdrop:blur-md after:bg-white after:w-5 after:h-5 after:absolute after:right-[3.5rem] after:-top-2 after:transform after:rotate-45 after:z-0">
				<img :src="playingData.l_cover_art" alt="cover_art" class="h-12 w-12 object-cover rounded-lg shadow-[0_0.7rem_2.9rem_0_#64646f33]" />
				<div class="flex flex-col">
					<a :href="playingData.link" target="_blank" class="text-xs sm:text-sm font-medium text-dark max-w-[15rem] overflow-hidden whitespace-nowrap text-ellipsis">
						{{ playingData.title }}
					</a>
					<p class="whitespace-nowrap text-sm sm:text-base font-normal text-dark">{{ playingData.artists }}</p>
				</div>
				<div class="bar h-3 w-3 flex justify-between gap-1">
					<span class="animate-bar bg-dark rounded-sm w-[0.3rem] h-full"></span>
					<span class="animate-bar -animate-delay-2000 bg-dark rounded-sm w-[0.3rem] h-full"></span>
					<span class="animate-bar -animate-delay-3000 bg-dark rounded-sm w-[0.3rem] h-full"></span>
				</div>
			</div>
		</div>
	</header>
</template>
