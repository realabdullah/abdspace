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

        <nav class="header__nav d-flex items-center md:d-none">
            <ul class="header__nav-list d-flex">
                <li v-for="nav in navs" :key="nav.route" class="header__nav-list--item position-relative">
                    <NuxtLink :to="nav.route" class="col-text text-none text-three hover:link"
                        :class="{ 'active': nav.route === $route.name }">
                        {{ nav.name }}
                    </NuxtLink>
                </li>
            </ul>
        </nav>
        <button class="col-text md:d-block d-none text-three bg-transparent cursor-pointer">menu</button>
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
