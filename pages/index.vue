<script setup lang="ts">
const { data: home } = await useAsyncData("home", () => queryCollection("home").first());

const { data: spotify } = await useAsyncData<{
	isPlaying: boolean;
	data?: { link: string; title: string };
}>("spotify", () => $fetch("/api/playing"), { lazy: true });

useSeoMeta({
	title: home.value?.title,
	description: home.value?.description,
});

const isMenuActive = ref(false);
</script>

<template>
	<div class="grid h-dvh grid-cols-10 grid-rows-2 px-5 py-10 md:px-10 xl:grid-rows-3 xl:px-24 xl:py-14">
		<div class="col-span-10 flex items-start justify-between gap-2 md:col-span-4">
			<div class="flex items-center gap-2">
				<Icon name="hugeicons:spotify" class="text-eerie_black-100 dark:text-french_gray-900" :size="24" />
				<span class="text-eerie_black-100 dark:text-french_gray-900 text-xs">
					<template v-if="spotify?.isPlaying && spotify?.data">
						Listening to
						<NuxtLink :to="spotify.data?.link" target="_blank" rel="noopener noreferrer" class="underline" external>
							{{ spotify.data?.title }}
						</NuxtLink>
					</template>
					<template v-else>Not listening atm 🙂‍↕️</template>
				</span>
			</div>

			<div class="relative md:hidden">
				<button class="text-eerie_black-100 dark:text-french_gray-900 cursor-pointer" @click="isMenuActive = !isMenuActive">
					{{ isMenuActive ? "CLOSE" : "MENU" }}
				</button>

				<div
					class="absolute top-12 right-0 h-[200px] max-w-[400px] overflow-hidden transition-all duration-200 ease-in-out"
					:class="[isMenuActive ? 'max-h-[120px] opacity-100' : 'pointer-events-none max-h-0 opacity-0']"
				>
					<nav class="flex flex-col gap-4 py-5">
						<NuxtLink to="/projects" class="text-eerie_black-100 dark:text-french_gray-900 py-2 pl-4 text-right text-xl uppercase hover:underline"> Projects </NuxtLink>
						<NuxtLink to="/blog" class="text-eerie_black-100 dark:text-french_gray-900 py-2 pl-4 text-right text-xl uppercase hover:underline"> Blog </NuxtLink>
					</nav>
				</div>
			</div>
		</div>

		<div class="col-span-10 row-span-2 grid grid-cols-subgrid grid-rows-subgrid md:col-span-6 xl:col-span-5 xl:row-span-3">
			<div class="col-span-8 row-start-1 ml-auto hidden items-start gap-4 md:flex">
				<NuxtLink v-for="(nav, index) in home?.navs" :key="index" :to="nav.link" class="text-eerie_black-100 dark:text-french_gray-900 hover:text-blue-500">{{ nav.name }}</NuxtLink>
			</div>

			<div class="col-span-8 col-start-1 row-start-2 m-auto mb-0 md:mr-0 md:text-right xl:row-start-3">
				<h1 class="text-eerie_black-100 dark:text-french_gray-900 text-3xl font-bold sm:text-4xl">
					{{ home?.header }}
				</h1>
				<p class="text-eerie_black-100 dark:text-french_gray-900 mt-2 text-sm sm:text-base">
					{{ home?.brief }}
				</p>

				<template v-if="home?.links?.length">
					<div class="mt-4 flex items-center gap-4 md:justify-end">
						<NuxtLink
							v-for="link in home.links"
							:key="link.name"
							:to="link.link"
							class="text-eerie_black-100 dark:text-french_gray-900 hover:text-blue-500"
							target="_blank"
							rel="noopener noreferrer"
							external
						>
							<Icon :name="link.name" size="20px" />
						</NuxtLink>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>
