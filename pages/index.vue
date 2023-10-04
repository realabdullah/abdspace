<script lang="ts" setup>

</script>

<template>
    <main class="container">
        <section class="container__intro d-flex items-end content-between md:items-unset md:flex-column">
            <h1 class="col-text weight-500 text-one break-all">Hello, I’m Abdullahi O.</h1>
            <p class="col-text weight-400 text-two text-right md:ml-auto">An experienced Frontend Engineer with passion for
                building beautiful and
                functional user interfaces.</p>
        </section>
        <br />
        <IconsUtility icon="arrow-down" />
        <br />
    </main>
</template>

<style lang="scss" scoped>
.container {
    padding: 10rem 3rem;
    max-width: 120rem;
    margin: 0 auto;

    &__intro {
        padding-bottom: 10rem;
        gap: 2rem;

        h1 {
            max-width: 45rem;
        }

        p {
            max-width: 55rem;
        }
    }
}
</style>
