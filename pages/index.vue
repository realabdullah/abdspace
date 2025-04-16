<script setup lang="ts">
const { data: home } = await useAsyncData(() =>
    queryCollection("home").first()
);

useSeoMeta({
    title: home.value?.title,
    description: home.value?.description,
});
</script>

<template>
    <div class="h-dvh relative grid grid-rows-2 grid-cols-10 xl:grid-rows-3">
        <div class="hidden md:block md:col-span-4" />
        <div
            class="row-span-2 col-span-8 md:col-span-6 xl:row-span-3 xl:col-span-5 grid grid-cols-subgrid grid-rows-subgrid">
            <div
                class="col-span-8 row-start-2 col-start-1 xl:row-start-3 md:text-right m-auto mb-0 md:mr-0 p-5 pt-20 md:p-10 xl:pr-0 xl:pb-24">
                <h1 class="text-3xl sm:text-4xl font-bold text-eerie_black-100 dark:text-french_gray-900">{{
                    home?.header }}</h1>
                <p class="mt-2 text-sm sm:text-base text-eerie_black-100 dark:text-french_gray-900">{{ home?.brief }}
                </p>

                <template v-if="home?.links?.length">
                    <div class="flex items-center md:justify-end mt-4 gap-4">
                        <NuxtLink 
                            v-for="link in home.links" :key="link.name"
                            :to="link.link"
                            class="text-eerie_black-100 dark:text-french_gray-900 hover:text-blue-500"
                            target="_blank"
                            rel="noopener noreferrer"
                            external>
                            <Icon :name="link.name" size="20px" />
                        </NuxtLink>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
