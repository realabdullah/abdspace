<script setup lang="ts">
const { data: featured } = await useAsyncData("projects-featured", () => queryCollection("projects").where("featured", "=", true).order("date", "DESC").all());
const { data: posts } = await useAsyncData("latest-writing", () => queryCollection("writings").order("createdAt", "DESC").limit(4).all());
const { data: postCount } = await useAsyncData("writing-count", () => queryCollection("writings").count());

const description = "I make interfaces for the web and care about the small things: how it moves, how it reads, how it feels to use.";
useSeoMeta({ title: "Abdullahi Odesanmi, frontend engineer", description, ogTitle: "Abdullahi Odesanmi, frontend engineer", ogDescription: description });
defineOgImage("Portfolio", { intro: description }, { alt: "Abdullahi Odesanmi, frontend engineer, with 頑張る (ganbaru) written down the right edge" });
</script>

<template>
	<main id="main">
		<section class="hero wrap">
			<div class="hero__text">
				<p class="mono muted hero__kicker">frontend engineer</p>
				<h1 class="hero__name">Abdullahi <em>Odesanmi</em></h1>
				<p class="hero__intro">
					I make interfaces for the web and care about the small things: how it moves, how it reads, how it feels to use. Outside the browser, I dabble in whatever I’m curious about at the
					time.
				</p>
				<NowLine class="hero__now" />
			</div>
			<GanbaruColumn class="hero__ganbaru" />
		</section>

		<div class="wrap">
			<section id="work" class="section">
				<h2 class="section__label mono">side projects</h2>
				<div>
					<ProjectList v-if="featured" :projects="featured" />
					<NuxtLink to="/projects" class="more">see the rest →</NuxtLink>
				</div>
			</section>

			<section v-if="posts?.length" id="writing" class="section">
				<h2 class="section__label mono">
					<span>writing</span><span class="faint">{{ postCount }}</span>
				</h2>
				<div class="index">
					<ul>
						<li v-for="post in posts" :key="post.slug">
							<NuxtLink :to="`/writings/${post.slug}`" class="row row--post">
								<span class="row__title">{{ post.title }}</span>
								<span class="row__meta mono">{{ formatMonthYear(post.createdAt) }} · {{ post.readTime }} min</span>
							</NuxtLink>
						</li>
					</ul>
					<NuxtLink v-if="(postCount ?? 0) > (posts?.length ?? 0)" to="/writings" class="mono muted link index__more">all writing →</NuxtLink>
				</div>
			</section>

			<section id="contact" class="section">
				<h2 class="section__label mono">contact</h2>
				<p class="contact">
					Write to me at <a href="mailto:abdulodesanmi@gmail.com" class="contact__link">abdulodesanmi@gmail.com</a>, or find me on
					<a href="https://github.com/realabdullah" target="_blank" rel="noopener noreferrer" class="contact__link">GitHub</a>,
					<a href="https://www.linkedin.com/in/abdullahiodesanmi/" target="_blank" rel="noopener noreferrer" class="contact__link">LinkedIn</a> and
					<a href="https://x.com/_realabd" target="_blank" rel="noopener noreferrer" class="contact__link">X</a>.
				</p>
			</section>
		</div>
	</main>
</template>

<style scoped>
.hero {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: clamp(1.25rem, 5vw, 4rem);
	align-items: start;
	min-height: min(52rem, calc(100svh - 6rem));
	padding-block: clamp(3rem, 12vh, 9rem) clamp(4rem, 10vw, 7rem);
}
.hero__text {
	display: flex;
	flex-direction: column;
	align-self: stretch;
}
.hero__kicker {
	margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
}
.hero__name {
	font-weight: 300;
	font-size: clamp(3.25rem, 10.5vw, 8.75rem);
	line-height: 0.92;
	letter-spacing: -0.035em;
	text-wrap: balance;
}
.hero__name em {
	display: block;
	font-weight: 250;
}
.hero__intro {
	max-width: 32rem;
	margin-top: clamp(2rem, 5vw, 3.25rem);
	font-size: clamp(1.125rem, 1.6vw, 1.3125rem);
	line-height: 1.5;
	text-wrap: pretty;
}
.hero__now {
	margin-top: auto;
	padding-top: clamp(3rem, 8vw, 5rem);
}
.hero__ganbaru {
	padding-top: clamp(0.25rem, 1vw, 1rem);
}
@media (max-width: 51.99rem) {
	.hero {
		min-height: 0;
		padding-top: 2.5rem;
	}
	.hero__now {
		padding-top: 3rem;
	}
}

.faint {
	color: var(--faint);
}

/* ─── Index rows (work and writing) ─── */

.row {
	display: grid;
	gap: 0.15rem;
	padding-block: 0.875rem;
	border-bottom: 1px solid var(--rule);
	transition: opacity 350ms ease;
}
li:first-child .row {
	border-top: 1px solid var(--rule);
}
.row__title {
	font-size: 1.375rem;
	line-height: 1.25;
	letter-spacing: -0.01em;
}
.row__about {
	color: var(--muted);
	font-size: 1rem;
	line-height: 1.45;
	text-wrap: pretty;
}
.row__meta {
	color: var(--muted);
}
.row__arrow {
	display: inline-block;
	opacity: 0;
	transform: translate(-3px, 3px);
	transition:
		opacity 300ms ease,
		transform 300ms var(--ease-out);
}

/* Hovering a row lets the rest of the list recede. */
@media (hover: hover) {
	.index:has(.row:hover) .row:not(:hover) {
		opacity: 0.32;
	}
	.row:hover .row__title {
		font-style: italic;
	}
	.row:hover .row__arrow {
		opacity: 1;
		transform: none;
	}
}

@media (min-width: 52rem) {
	.row {
		grid-template-columns: 12rem minmax(0, 1fr) 13rem;
		gap: 1.5rem;
		align-items: baseline;
	}
	.row__meta {
		text-align: right;
	}
	.row--post {
		grid-template-columns: minmax(0, 1fr) auto;
	}
	.row--post .row__title {
		font-size: 1.625rem;
	}
}
@media (max-width: 51.99rem) {
	.row__meta {
		margin-top: 0.25rem;
	}
}

.more {
	display: inline-block;
	margin-top: 1.75rem;
	color: var(--muted);
	font-style: italic;
	transition: color 200ms ease;
}
.more:hover {
	color: var(--fg);
}
.index__more {
	display: inline-block;
	margin-top: 1.5rem;
}

/* ─── Contact ─── */

.contact {
	max-width: 46rem;
	font-weight: 300;
	font-size: clamp(1.75rem, 4vw, 2.75rem);
	line-height: 1.22;
	letter-spacing: -0.015em;
	text-wrap: pretty;
}
.contact__link {
	font-style: italic;
	background: linear-gradient(currentColor, currentColor) no-repeat 0 100% / 100% 1px;
	transition: background-size 450ms var(--ease-out);
	overflow-wrap: anywhere;
}
.contact__link:hover {
	background-size: 0% 1px;
	background-position: 100% 100%;
}
</style>
