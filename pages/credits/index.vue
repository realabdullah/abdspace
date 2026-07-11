<script setup lang="ts">
useSeoMeta({
	title: "Credits & influences — Abdullahi Odesanmi",
	description: "The portfolios and design decisions that informed Abdullahi Odesanmi’s portfolio redesign.",
});

defineOgImage("Portfolio", {
	title: "Credits & influences",
	description: "A transparent record of the portfolios and ideas that shaped this redesign.",
	section: "Credits",
});

const influences = [
	{
		number: "01",
		name: "Likando Kayombo",
		url: "https://www.likandokayombo.com/",
		focus: "Editorial restraint",
		observation: "The work feels confident because it gives typography, whitespace, and a small number of strong gestures room to carry the experience.",
		translation: "I carried that restraint into the oversized type, quiet neutral palette, thin rules, and deliberate pacing of the homepage.",
		credit: "Visual rhythm, editorial confidence, and the idea that a portfolio can feel like a point of view.",
	},
	{
		number: "02",
		name: "Animations.dev",
		url: "https://animationsdev-microinteractions.vercel.app/",
		repo: "https://github.com/dimicx/animationsdev-hero",
		focus: "Micro-interactions",
		observation: "Small movements—hover responses, transitions, and interface feedback—make a simple composition feel alive without turning it into a spectacle.",
		translation: "I used restrained page transitions, link underlines, cursor behavior, and project-row feedback so interaction feels present but never noisy.",
		credit: "The reminder that motion is part of the visual language, not decoration added at the end.",
	},
	{
		number: "03",
		name: "Ayanfe Olarinde",
		url: "https://ayanfe-olarinde.vinyldavyl.xyz/",
		repo: "https://github.com/Vinyl-Davyl/ayanfe-olarinde-chronicle",
		focus: "Personal narrative",
		observation: "A portfolio can document a person’s practice and interests as a story, rather than presenting a flat list of deliverables.",
		translation: "That influenced the journal, context section, project stories, and the decision to let personality sit alongside technical work.",
		credit: "The chronological, human approach to presenting a creative practice.",
	},
	{
		number: "04",
		name: "Adura",
		url: "https://www.adura.design/",
		focus: "Portfolio as exhibition",
		observation: "Adura’s portfolio frames work as an exhibition with a distinct voice, a sense of place, and an invitation to explore the person behind the work.",
		translation: "I used the same ambition as a starting point: a portfolio should feel authored. Here, that becomes a Lagos-rooted, editorial system for engineering work.",
		credit: "The strongest influence on the site’s tone, storytelling ambition, and sense of personality.",
	},
	{
		number: "05",
		name: "DevDami",
		url: "https://devdami.live/",
		focus: "Developer identity",
		observation: "The reference treats a developer portfolio as more than a résumé: it is a compact identity system that can be direct, memorable, and technically aware.",
		translation: "That informed the balance between plainspoken copy, visible engineering details, direct project links, and a more expressive visual surface.",
		credit: "The permission to make a developer portfolio feel personal without losing clarity.",
	},
];
</script>

<template>
	<div class="mx-auto min-h-screen max-w-[1440px] px-6 sm:px-10 lg:px-20">
		<header class="border-ink/15 flex h-20 items-center justify-between border-b font-mono text-[10px] tracking-[0.12em] uppercase">
			<NuxtLink to="/" class="hover:text-coral transition-colors">← Index</NuxtLink>
			<NuxtLink to="/" class="text-lg font-semibold tracking-[-0.035em]">ABD<span class="text-coral ml-0.5">·</span></NuxtLink>
		</header>

		<main class="py-20 sm:py-28">
			<section class="border-ink grid gap-12 border-t pt-4 lg:grid-cols-[1fr_2fr] lg:gap-16">
				<p class="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">(03) / Credits</p>
				<div>
					<h1 class="max-w-5xl text-[clamp(3.5rem,9vw,9rem)] leading-[0.86] font-medium tracking-[-0.095em]">
						A record of<br /><em class="text-coral font-serif font-normal">influence.</em>
					</h1>
					<p class="mt-10 max-w-2xl text-base leading-relaxed text-stone-500">
						Good work is often made in conversation with other work. These are the portfolios I studied while shaping this site—and the specific ideas I carried forward.
					</p>
				</div>
			</section>

			<section class="border-ink/15 mt-24 border-t sm:mt-32">
				<article v-for="influence in influences" :key="influence.name" class="border-ink/15 grid gap-8 border-b py-12 sm:grid-cols-[56px_1fr_1fr] sm:gap-10 sm:py-16">
					<span class="font-mono text-[10px] text-stone-500">{{ influence.number }}</span>
					<div>
						<p class="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">{{ influence.focus }}</p>
						<h2 class="mt-4 text-3xl leading-none tracking-[-0.07em] sm:text-5xl">{{ influence.name }}</h2>
						<div class="mt-6 flex flex-wrap gap-4 font-mono text-[10px] tracking-[0.08em] uppercase">
							<a :href="influence.url" target="_blank" rel="noopener noreferrer" class="text-coral hover:underline">Visit site ↗</a>
							<a v-if="influence.repo" :href="influence.repo" target="_blank" rel="noopener noreferrer" class="hover:text-coral text-stone-500">View repo ↗</a>
						</div>
					</div>
					<div class="grid gap-6 text-sm leading-relaxed text-stone-500">
						<p><span class="text-ink font-medium">What I noticed.</span> {{ influence.observation }}</p>
						<p><span class="text-ink font-medium">How it translated here.</span> {{ influence.translation }}</p>
						<p class="border-coral border-l-2 pl-4 text-stone-600"><span class="text-ink font-medium">With thanks.</span> {{ influence.credit }}</p>
					</div>
				</article>
			</section>

			<section class="border-ink/15 mt-20 border-t pt-6 sm:mt-28 sm:flex sm:items-end sm:justify-between">
				<p class="max-w-xl text-sm leading-relaxed text-stone-500">This site was developed collaboratively by Abdullahi Odesanmi and Codex by OpenAI.</p>
				<NuxtLink to="/" class="text-coral mt-6 font-mono text-[10px] tracking-[0.1em] uppercase hover:underline sm:mt-0">Back to index ↗</NuxtLink>
			</section>
		</main>

		<footer class="border-ink/15 flex min-h-20 items-center justify-between border-t py-5 font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase">
			<span>© {{ new Date().getFullYear() }} Abdullahi Odesanmi</span><NuxtLink to="/blog">Notes ↗</NuxtLink>
		</footer>
	</div>
</template>
