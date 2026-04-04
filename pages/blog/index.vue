<script lang="ts" setup>
const { data: home } = await useAsyncData("blogPage", () => queryCollection("blog").path("/blog").first());
const { data: blogs } = await useAsyncData("blogs", () => queryCollection("blog").order("createdAt", "DESC").where("slug", "IS NOT NULL", "/blog").all());
useSeoMeta({ title: home.value?.title, description: home.value?.description });
</script>

<template>
	<div class="sub-pg">
		<header class="sub-hdr">
			<NuxtLink to="/" class="lh back-a">← Index</NuxtLink>
			<h1 class="sub-pg-title">Writing</h1>
		</header>

		<hr class="sub-rule" />

		<main>
			<ol class="sub-lst">
				<li v-for="(b, i) in blogs" :key="String(b.slug)" class="sub-row">
					<span class="sub-idx" aria-hidden="true">{{ String(i + 1).padStart(2, "0") }}</span>
					<div class="sub-body">
						<ClientOnly>
							<time class="sub-date">{{ formatDate(b.createdAt) }}</time>
						</ClientOnly>
						<h2 class="sub-item-title">
							<NuxtLink :to="b.path" class="lh">{{ b.title }}</NuxtLink>
						</h2>
						<p class="sub-desc">{{ b.brief }}</p>
						<div class="sub-links">
							<NuxtLink :to="b.path" class="lh sub-rl">Read&nbsp;·&nbsp;{{ b.readTime }}&thinsp;min ↗</NuxtLink>
						</div>
					</div>
				</li>
			</ol>
		</main>

		<hr class="sub-rule" />

		<footer class="sub-ftr">
			<span class="sub-ftr-name">Abdullahi Odesanmi</span>
			<span class="sub-ftr-yr">© 2026</span>
		</footer>
	</div>
</template>

<style scoped>
.sub-pg {
	max-width: 1200px;
	margin: 0 auto;
	padding: 0 clamp(1.25rem, 5vw, 5rem);
}

.sub-hdr {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	padding: 1.5rem 0;
}

.back-a {
	font-family: var(--ff-mono);
	font-size: 11px;
	letter-spacing: 0.1em;
	color: var(--muted);
}

.sub-pg-title {
	font-family: var(--ff-mono);
	font-size: 10px;
	font-weight: 400;
	letter-spacing: 0.28em;
	text-transform: uppercase;
	color: var(--muted);
	margin: 0;
}

.sub-rule {
	border: none;
	border-top: 1px solid var(--rule);
	margin: 0;
}

.sub-lst {
	list-style: none;
	margin: 0;
	padding: 0;
}

.sub-row {
	display: grid;
	grid-template-columns: 2.5rem 1fr;
	gap: 0 1.5rem;
	padding: clamp(2rem, 5vh, 3.25rem) 0;
	border-bottom: 1px solid var(--rule);
}

.sub-idx {
	font-family: var(--ff-mono);
	font-size: 10px;
	color: var(--muted);
	padding-top: 4px;
	letter-spacing: 0.05em;
}

.sub-body {
	min-width: 0;
}

.sub-date {
	display: block;
	font-family: var(--ff-mono);
	font-size: 10px;
	color: var(--muted);
	letter-spacing: 0.05em;
	margin-bottom: 0.4rem;
}

.sub-item-title {
	font-family: var(--ff-display);
	font-weight: 500;
	font-size: clamp(1.35rem, 2.8vw, 2.2rem);
	letter-spacing: -0.015em;
	line-height: 1.15;
	margin: 0 0 0.5rem;
	color: var(--ink);
}
.sub-item-title a {
	color: inherit;
	text-decoration: none;
}

.sub-desc {
	font-family: var(--ff-mono);
	font-size: 12.5px;
	line-height: 1.78;
	color: var(--muted);
	max-width: 62ch;
	margin: 0.4rem 0 1rem;
}

.sub-links {
	display: flex;
	gap: 1.75rem;
}
.sub-rl {
	font-family: var(--ff-mono);
	font-size: 11px;
	letter-spacing: 0.08em;
	color: var(--accent);
}

.sub-ftr {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 2.25rem 0 3.5rem;
}
.sub-ftr-name {
	font-family: var(--ff-display);
	font-size: 13px;
	color: var(--muted);
}
.sub-ftr-yr {
	font-family: var(--ff-mono);
	font-size: 11px;
	color: var(--muted);
}

@media (max-width: 600px) {
	.sub-row {
		grid-template-columns: 2rem 1fr;
		gap: 0 0.85rem;
	}
}
</style>
