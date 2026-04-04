<script setup lang="ts">
const { data: spotify } = await useAsyncData<{
	isPlaying: boolean;
	data?: { link: string; title: string };
}>("spotify", () => $fetch("/api/playing"), { lazy: true });

useSeoMeta({
	title: "Abdullahi Odesanmi — Frontend Engineer",
	description: "Frontend Engineer focused on building beautiful interfaces with Vue, Nuxt, and TypeScript.",
});

const songTitle = computed(() => {
	if (!spotify.value?.isPlaying || !spotify.value?.data?.title) return null;
	const t = spotify.value.data.title;
	return t.length > 24 ? t.slice(0, 24) + "…" : t;
});
</script>

<template>
	<div class="pg">
		<header class="hdr">
			<div class="now" aria-label="Currently listening">
				<ClientOnly>
					<template v-if="songTitle && spotify?.data">
						<span class="dot dot--on" aria-hidden="true" />
						<a :href="spotify.data.link" target="_blank" rel="noopener noreferrer" class="lh now-txt">
							{{ songTitle }}
						</a>
					</template>
					<template v-else>
						<span class="dot" aria-hidden="true" />
						<span class="now-txt">not listening</span>
					</template>
				</ClientOnly>
			</div>

			<nav aria-label="Primary navigation">
				<NuxtLink to="/projects" class="lh nav-a">Projects</NuxtLink>
				<NuxtLink to="/blog" class="lh nav-a">Blog</NuxtLink>
			</nav>
		</header>

		<section class="hero" aria-labelledby="hero-name">
			<h1 id="hero-name" class="name">
				<span class="nw nw1">Abdullahi</span>
				<span class="nw nw2">Odesanmi</span>
			</h1>

			<div class="hero-meta">
				<div class="hero-role">
					<p class="role">Frontend Engineer</p>
					<p class="bio">Frontend Engineer focused on building beautiful interfaces. Vue · Nuxt · TypeScript</p>
				</div>
			</div>

			<aside class="ganbaru" aria-label="Personal motto">ganbaru (頑張る)</aside>
		</section>
	</div>
</template>

<style scoped>
.pg {
	max-width: 1200px;
	margin: 0 auto;
	padding: 0 clamp(1.25rem, 5vw, 5rem);
	min-height: 100vh;
	display: flex;
	flex-direction: column;
}

.hdr {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1.5rem 0;
	position: sticky;
	top: 0;
	background: var(--bg);
	z-index: 20;
}

.now {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.dot {
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: var(--muted);
	flex-shrink: 0;
}
.dot--on {
	background: var(--accent);
	animation: blink 2.4s ease-in-out infinite;
}

@keyframes blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.2;
	}
}

.now-txt {
	font-family: var(--ff-mono);
	font-size: 10px;
	color: var(--muted);
	text-decoration-color: currentColor;
	letter-spacing: 0.04em;
}

nav {
	display: flex;
	gap: 2.5rem;
}
.nav-a {
	font-family: var(--ff-mono);
	font-size: 11px;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--ink);
}

.hero {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: clamp(3.5rem, 10vh, 8rem) 0 clamp(3rem, 8vh, 6rem);
}

.name {
	font-family: var(--ff-display);
	font-weight: 600;
	font-size: clamp(4rem, 12.5vw, 13.5rem);
	line-height: 0.87;
	letter-spacing: -0.025em;
	margin: 0 0 clamp(2rem, 5vh, 3.5rem);
	color: var(--ink);
}

.nw {
	display: block;
	opacity: 0;
	animation: wrdIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.nw1 {
	animation-delay: 0.06s;
}
.nw2 {
	animation-delay: 0.24s;
	padding-left: clamp(1.5rem, 8vw, 9rem);
}

@keyframes wrdIn {
	from {
		opacity: 0;
		transform: translateY(30px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.hero-meta {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 1.5rem;
	animation: fdIn 0.7s ease 0.45s both;
}

.hero-role {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}
.role {
	font-family: var(--ff-mono);
	font-size: 13px;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--ink);
	margin: 0;
}
.stack {
	display: none;
	margin: 0;
}

.bio {
	font-family: var(--ff-mono);
	font-size: clamp(13px, 1.4vw, 15px);
	line-height: 1.8;
	color: var(--muted);
	max-width: 54ch;
	margin: 0;
}

.ganbaru {
	display: block;
	margin-top: clamp(1.25rem, 3vh, 2.25rem);
	font-family: var(--ff-mono);
	font-size: 11px;
	font-style: italic;
	color: var(--muted);
	letter-spacing: 0.04em;
	animation: fdIn 0.5s ease 0.6s both;
}

@keyframes fdIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

@media (max-width: 600px) {
	.hdr {
		position: static;
		align-items: flex-start;
		gap: 1rem;
		flex-direction: column;
	}

	.name {
		font-size: clamp(3.2rem, 18vw, 5.5rem);
		line-height: 0.9;
	}
	.nw2 {
		padding-left: clamp(1rem, 5vw, 2rem);
	}

	nav {
		gap: 1.5rem;
	}

	.hero-meta {
		flex-direction: column;
		align-items: flex-start;
	}
}
</style>
