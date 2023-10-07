<script lang="ts" setup>
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

        <div class="listening"></div>
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

    &__nav {
        &-list {
            gap: 3rem;
        }
    }
}
</style>
