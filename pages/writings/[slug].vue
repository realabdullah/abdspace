<script setup lang="ts">
const slug = useRoute().params.slug as string;
const { data: post } = await useAsyncData(`writing-${slug}`, () => queryCollection("writings").where("slug", "=", slug).first());
if (!post.value) throw createError({ statusCode: 404, statusMessage: "Writing not found", fatal: true });

const { data: siblings } = await useAsyncData(`writing-siblings-${slug}`, () =>
	queryCollectionItemSurroundings("writings", post.value!.path, { fields: ["title", "slug"] }).order("createdAt", "DESC")
);
const [newer, older] = siblings.value ?? [];

const shaped = computed(() => (post.value ? shapeArticle(post.value.body as Parameters<typeof shapeArticle>[0]) : null));
const article = computed(() => (post.value && shaped.value ? { ...post.value, body: shaped.value.body } : null));
const sections = computed(() => shaped.value?.sections ?? []);

/* ─── Reading position ─── */

const prose = ref<{ $el: HTMLElement } | null>(null);
const progress = ref(0);
const active = ref("");
let frame = 0;

const measure = () => {
	frame = 0;
	const el = prose.value?.$el;
	if (!el) return;
	const rect = el.getBoundingClientRect();
	const line = innerHeight * 0.35;
	progress.value = Math.min(1, Math.max(0, (line - rect.top) / rect.height));

	let current = "";
	for (const section of sections.value) {
		const heading = document.getElementById(section.id);
		if (heading && heading.getBoundingClientRect().top < line) current = section.id;
	}
	active.value = current;
};
const schedule = () => (frame ||= requestAnimationFrame(measure));

onMounted(() => {
	measure();
	addEventListener("scroll", schedule, { passive: true });
	addEventListener("resize", schedule, { passive: true });
});
onUnmounted(() => {
	cancelAnimationFrame(frame);
	removeEventListener("scroll", schedule);
	removeEventListener("resize", schedule);
});

const minutesLeft = computed(() => Math.ceil((post.value?.readTime ?? 0) * (1 - progress.value)));
const remaining = computed(() => (progress.value >= 0.995 ? "finished" : minutesLeft.value <= 1 ? "under a minute left" : `${minutesLeft.value} min left`));

/* ─── Meta ─── */

const canonicalUrl = `https://www.abdspace.xyz/writings/${slug}`;
useSeoMeta({
	title: `${post.value.title}, Abdullahi Odesanmi`,
	description: post.value.description,
	ogTitle: post.value.title,
	ogDescription: post.value.description,
	ogType: "article",
	articlePublishedTime: post.value.createdAt,
});
useHead({
	link: [{ rel: "canonical", href: canonicalUrl }],
	script: [
		{
			type: "application/ld+json",
			innerHTML: JSON.stringify({
				"@context": "https://schema.org",
				"@type": "BlogPosting",
				headline: post.value.title,
				description: post.value.description,
				datePublished: post.value.createdAt,
				mainEntityOfPage: canonicalUrl,
				author: { "@type": "Person", name: "Abdullahi Odesanmi", url: "https://www.abdspace.xyz" },
			}),
		},
	],
});
defineOgImage("Portfolio", { title: post.value.title, description: `${formatFullDate(post.value.createdAt)} · ${post.value.readTime} min read` });
</script>

<template>
	<main v-if="article" id="main" class="wrap">
		<div class="reader">
			<header class="head">
				<NuxtLink to="/writings" class="mono muted link">← writing</NuxtLink>
				<h1 class="head__title">{{ article.title }}</h1>
				<p class="head__lede">{{ article.description }}</p>
				<p class="mono muted">
					<time :datetime="article.createdAt">{{ formatFullDate(article.createdAt) }}</time> · {{ article.readTime }} min read
				</p>
			</header>

			<!-- Margin notes: where you are, and how far is left. -->
			<nav v-if="sections.length > 1" class="contents mono" aria-label="Contents">
				<p class="contents__label muted">contents</p>
				<ol>
					<li v-for="(section, i) in sections" :key="section.id" :class="{ 'is-active': active === section.id, 'is-sub': section.level === 3 }">
						<a :href="`#${section.id}`">
							<span class="contents__num">{{ String(i + 1).padStart(2, "0") }}</span>
							<span class="contents__title">{{ section.title }}</span>
						</a>
					</li>
				</ol>
			</nav>

			<aside class="gauge mono muted" aria-hidden="true">
				<span class="gauge__track"><span class="gauge__fill" :style="{ transform: `scaleY(${progress})` }" /></span>
				<span class="gauge__text">{{ remaining }}</span>
			</aside>

			<ContentRenderer ref="prose" :value="article" class="prose body" />

			<!-- 終 (owari): the mark that closes a Japanese film. -->
			<div class="fin">
				<span lang="ja" class="fin__mark">終</span>
				<span class="mono muted">owari, the end</span>
			</div>
		</div>

		<nav v-if="newer || older" class="siblings" aria-label="More writing">
			<NuxtLink v-if="older" :to="`/writings/${older.slug}`" class="siblings__link">
				<span class="mono muted">previous</span>
				<span class="siblings__title">{{ older.title }}</span>
			</NuxtLink>
			<NuxtLink v-if="newer" :to="`/writings/${newer.slug}`" class="siblings__link siblings__link--next">
				<span class="mono muted">next</span>
				<span class="siblings__title">{{ newer.title }}</span>
			</NuxtLink>
		</nav>
	</main>
</template>

<style scoped>
/* Text in the middle column, notes in the margins on either side. */
.reader {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 40rem) minmax(0, 1fr);
	column-gap: clamp(1.5rem, 4vw, 4rem);
	padding-block: clamp(2.5rem, 8vw, 5rem) clamp(3rem, 8vw, 5rem);
}
.head,
.body,
.fin {
	grid-column: 2;
}

.head {
	display: grid;
	justify-items: start;
	gap: 1.5rem;
	padding-bottom: clamp(2.5rem, 6vw, 3.5rem);
	margin-bottom: clamp(2.5rem, 6vw, 3.5rem);
	border-bottom: 1px solid var(--rule);
}
.head__title {
	margin-top: clamp(1.5rem, 5vw, 3rem);
	font-weight: 300;
	font-size: clamp(2.5rem, 6.5vw, 4.25rem);
	line-height: 1.02;
	letter-spacing: -0.03em;
	text-wrap: balance;
}
.head__lede {
	font-size: 1.25rem;
	font-style: italic;
	color: var(--muted);
	text-wrap: pretty;
}

/* First paragraph opens a little larger, like the first page of a chapter. */
.body > :deep(p:first-child) {
	font-size: 1.375rem;
	line-height: 1.55;
}

/* ─── Contents (left margin) ─── */
.contents {
	display: none;
	grid-column: 1;
	grid-row: 2 / span 2;
	justify-self: end;
	align-self: start;
	position: sticky;
	top: 2.5rem;
	width: min(100%, 13rem);
	max-height: calc(100svh - 5rem);
	overflow-y: auto;
	scrollbar-width: none;
}
.contents__label {
	margin-bottom: 1rem;
}
.contents li + li {
	margin-top: 0.6rem;
}
.contents a {
	display: grid;
	grid-template-columns: 1.75rem minmax(0, 1fr);
	color: var(--faint);
	line-height: 1.45;
	transition: color 250ms ease;
}
.contents .is-sub a {
	padding-left: 1rem;
}
.contents a:hover,
.contents .is-active a {
	color: var(--fg);
}
.contents .is-active .contents__title {
	font-style: italic;
}

/* ─── Progress (right margin), written top to bottom ─── */
.gauge {
	display: none;
	grid-column: 3;
	grid-row: 2 / span 2;
	justify-self: start;
	align-self: start;
	position: sticky;
	top: 2.5rem;
	gap: 0.75rem;
}
.gauge__track {
	position: relative;
	width: 1px;
	height: 9rem;
	background: var(--rule);
}
.gauge__fill {
	position: absolute;
	inset: 0;
	background: var(--fg);
	transform-origin: top;
	transform: scaleY(0);
}
.gauge__text {
	writing-mode: vertical-rl;
	white-space: nowrap;
}

@media (min-width: 72rem) {
	.contents {
		display: block;
	}
	.gauge {
		display: flex;
	}
}

/* ─── End mark ─── */
.fin {
	display: grid;
	justify-items: center;
	gap: 0.75rem;
	margin-top: clamp(4rem, 10vw, 6rem);
}
.fin__mark {
	font-weight: 800;
	font-size: 2.5rem;
	line-height: 1;
}

/* ─── Next / previous ─── */
.siblings {
	display: grid;
	gap: 1.5rem;
	max-width: 40rem;
	margin: 0 auto clamp(4rem, 10vw, 6rem);
	padding-top: 2rem;
	border-top: 1px solid var(--rule);
}
.siblings__link {
	display: grid;
	gap: 0.25rem;
	font-size: 1.125rem;
	line-height: 1.3;
}
.siblings__link:hover .siblings__title {
	font-style: italic;
}
@media (min-width: 40rem) {
	.siblings {
		grid-template-columns: 1fr 1fr;
	}
	.siblings__link--next {
		grid-column: 2;
		text-align: right;
	}
}
</style>
