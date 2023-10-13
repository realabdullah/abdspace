<script lang="ts" setup>
interface BlogPost {
    slug: string;
    title: string;
    brief: string;
}

const blogPosts = ref<BlogPost[]>([]);

const getBlogPosts = async () => {
	const { data } = await useFetch("/api/blogs");
	if (data.value) {
		blogPosts.value = data.value;
	}
};

await getBlogPosts();
</script>

<template>
    <section v-if="blogPosts.length > 0" class="cards">
        <h1 class="cards__header col-text weight-500 text-one">Articles.</h1>
        <div class="cards__content d-grid">
            <BlogCard v-for="blog in blogPosts" :key="blog.slug" :blog="blog" />
        </div>
    </section>
</template>

<style lang="scss" scoped>
.cards {
    padding: 10rem 0;

    @media screen and (max-width: 600px) {
        padding: 5rem 0;
    }

    &__header {
        margin-bottom: 5rem;
    }

    &__content {
        grid-template-columns: repeat(auto-fit, minmax(45rem, 1fr));
        gap: 3rem;

        @media screen and (max-width: 600px) {
            grid-template-columns: 1fr;
        }
    }
}
</style>