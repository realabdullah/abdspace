<script setup lang="ts">
const { data: home } = await useAsyncData(() =>
    queryCollection("home").first()
);

const { data: spotify } = await useAsyncData<{isPlaying: boolean, data?: { link: string; title: string } }>(
  'spotify',
  () => $fetch('/api/playing')
)

useSeoMeta({
    title: home.value?.title,
    description: home.value?.description,
});
</script>

<template>
    <div class="h-dvh relative grid grid-rows-2 grid-cols-10 xl:grid-rows-3">
        <div class="col-span-8 md:col-span-4 pl-5 md:pl-10 pt-10 xl:pl-24">
            <div class="flex items-center gap-2">
                <Icon name="hugeicons:spotify" class="text-eerie_black-100 dark:text-french_gray-900" :size="24" />
                <span class="text-xs text-eerie_black-100 dark:text-french_gray-900">
                    <template v-if="spotify?.isPlaying && spotify?.data">
                        Listening to
                        <NuxtLink :to="spotify.data?.link" target="_blank" rel="noopener noreferrer" class="underline" external>
                            {{ spotify.data?.title }}
                        </NuxtLink>
                    </template>
                    <template v-else>Not listening atm 🙂‍↕️</template>
                </span>
            </div>
        </div>
        <div
            class="row-span-2 col-span-10 md:col-span-6 xl:row-span-3 xl:col-span-5 grid grid-cols-subgrid grid-rows-subgrid">
            <div
                class="col-span-8 row-start-2 col-start-1 xl:row-start-3 md:text-right m-auto mb-0 md:mr-0 p-5 pt-20 md:p-10 xl:pr-0 xl:pb-24">
                <h1 class="text-3xl sm:text-4xl font-bold text-eerie_black-100 dark:text-french_gray-900">{{
                    home?.header }}</h1>
                <p class="mt-2 text-sm sm:text-base text-eerie_black-100 dark:text-french_gray-900">{{ home?.brief }}
                </p>

                <template v-if="home?.links?.length">
                    <div class="flex items-center md:justify-end mt-4 gap-4">
                        <NuxtLink 
                            v-for="link in home.links" :key="link.name" :to="link.link"
                            class="text-eerie_black-100 dark:text-french_gray-900 hover:text-blue-500" target="_blank"
                            rel="noopener noreferrer" external>
                            <Icon :name="link.name" size="20px" />
                        </NuxtLink>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
