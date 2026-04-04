<script lang="ts" setup>
const slug = computed(() => useRoute().params.slug as string);
const { data: blog } = await useAsyncData(slug.value, () => queryCollection("blog").where("slug", "=", slug.value).first());

useSeoMeta({
	title: blog.value?.title,
	description: blog.value?.brief,
	ogTitle: blog.value?.title,
	ogDescription: blog.value?.brief,
});
</script>

<template>
	<div class="art-pg">
		<!-- ── TOP BAR ──────────────────────────────────── -->
		<header class="art-hdr">
			<NuxtLink to="/blog" class="lh back-a">← Writing</NuxtLink>
			<span class="art-wordmark">AO.</span>
		</header>

		<hr class="art-rule" />

		<!-- ── ARTICLE ──────────────────────────────────── -->
		<main class="art-main">
			<div class="art-col">
				<!-- Meta -->
				<div class="art-meta">
					<ClientOnly>
						<time class="art-date">{{ formatDate(blog?.createdAt) }}</time>
					</ClientOnly>
					<span class="art-sep">·</span>
					<span class="art-readtime">{{ blog?.readTime }}&thinsp;min read</span>
				</div>

				<h1 class="art-title">{{ blog?.title }}</h1>

				<p class="art-brief">{{ blog?.brief }}</p>

				<hr class="art-rule art-rule--inner" />

				<!-- Body -->
				<div class="art-body">
					<ContentRenderer v-if="blog?.body" :value="blog?.body" />
					<p v-else>No content found.</p>
				</div>
			</div>
		</main>

		<hr class="art-rule" />

		<footer class="art-ftr">
			<NuxtLink to="/blog" class="lh back-a">← All articles</NuxtLink>
			<span class="art-ftr-yr">© 2026</span>
		</footer>
	</div>
</template>

<style scoped>
.art-pg {
	max-width: 1200px;
	margin: 0 auto;
	padding: 0 clamp(1.25rem, 5vw, 5rem);
}

/* ── HEADER ──────────────────────────────────────────── */
.art-hdr {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1.5rem 0;
}

.back-a {
	font-family: var(--ff-mono);
	font-size: 11px;
	letter-spacing: 0.1em;
	color: var(--muted);
}

.art-wordmark {
	font-family: var(--ff-display);
	font-size: 15px;
	font-weight: 600;
	color: var(--ink);
}

.art-rule {
	border: none;
	border-top: 1px solid var(--rule);
	margin: 0;
}
.art-rule--inner {
	margin: 2.5rem 0;
}

/* ── ARTICLE BODY ────────────────────────────────────── */
.art-main {
	padding: clamp(3rem, 8vh, 6rem) 0;
}

.art-col {
	max-width: 680px;
}

.art-meta {
	display: flex;
	align-items: center;
	gap: 0.65rem;
	margin-bottom: 1.5rem;
}
.art-date,
.art-sep,
.art-readtime {
	font-family: var(--ff-mono);
	font-size: 10px;
	color: var(--muted);
	letter-spacing: 0.05em;
}

.art-title {
	font-family: var(--ff-display);
	font-weight: 600;
	font-size: clamp(2rem, 5vw, 3.5rem);
	letter-spacing: -0.02em;
	line-height: 1.1;
	margin: 0 0 1.25rem;
	color: var(--ink);
}

.art-brief {
	font-family: var(--ff-mono);
	font-size: 13px;
	line-height: 1.8;
	color: var(--muted);
	margin: 0;
	border-left: 2px solid var(--accent);
	padding-left: 1rem;
}

/* ── PROSE ───────────────────────────────────────────── */
.art-body {
	font-family: var(--ff-mono);
	font-size: 13.5px;
	line-height: 1.85;
	color: var(--ink);
}

.art-body :deep(h2) {
	font-family: var(--ff-display);
	font-weight: 600;
	font-size: clamp(1.5rem, 3vw, 2.1rem);
	letter-spacing: -0.015em;
	margin: 3rem 0 0.75rem;
	color: var(--ink);
}

.art-body :deep(h3) {
	font-family: var(--ff-display);
	font-weight: 500;
	font-size: clamp(1.2rem, 2vw, 1.6rem);
	letter-spacing: -0.01em;
	margin: 2rem 0 0.5rem;
	color: var(--ink);
}

.art-body :deep(p) {
	margin: 0 0 1.35rem;
	color: var(--muted);
}

.art-body :deep(a) {
	color: var(--accent);
	text-decoration: underline;
	text-underline-offset: 2px;
}

.art-body :deep(ul),
.art-body :deep(ol) {
	margin: 0 0 1.35rem;
	padding-left: 1.25rem;
	color: var(--muted);
}
.art-body :deep(li) {
	margin-bottom: 0.35rem;
}

.art-body :deep(strong) {
	font-weight: 500;
	color: var(--ink);
}

.art-body :deep(blockquote) {
	margin: 1.5rem 0;
	padding-left: 1rem;
	border-left: 2px solid var(--accent);
	color: var(--muted);
	font-style: italic;
}

/* ── FOOTER ──────────────────────────────────────────── */
.art-ftr {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1.75rem 0 3rem;
}
.art-ftr-yr {
	font-family: var(--ff-mono);
	font-size: 11px;
	color: var(--muted);
}
</style>
