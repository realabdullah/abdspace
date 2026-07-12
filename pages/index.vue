<script setup lang="ts">
const { data: home } = await useAsyncData("home", () => queryCollection("home").first());
const { data: projects } = await useAsyncData("featured-projects", () => queryCollection("projects").order("created_at", "DESC").limit(4).all());

useSeoMeta({ title: "Abdullahi Odesanmi — Frontend Engineer", description: home.value?.description || "Frontend engineer building thoughtful digital products." });
defineOgImage("Portfolio", {
	title: "Abdullahi Odesanmi — Frontend Engineer",
	description: home.value?.description || "Software engineer building thoughtful digital products with care.",
	section: "Portfolio",
});

const currentYear = new Date().getFullYear();
const fallbackProjects = [
	{ title: "Kudilog", description: "A local-first budgeting experience.", created_at: "2026", tags: ["Product", "Engineering"] },
	{ title: "TaskGid", description: "A collaborative task management platform.", created_at: "2025", tags: ["Platform", "Systems"] },
	{ title: "Lifestack", description: "A small experiment in personal systems.", created_at: "2026", tags: ["Experiment", "Interface"] },
];
const featuredProjects = computed(() => (projects.value?.length ? projects.value : fallbackProjects));
const projectUrl = (project: { title?: string; path?: string; stem?: string }) => {
	if (project.path?.startsWith("/")) return project.path;
	if (project.path?.startsWith("projects/")) return `/${project.path}`;
	return project.path ? `/${project.path}` : `/${project.stem}`;
};
</script>

<template>
	<div class="mx-auto min-h-screen max-w-[1440px] px-6 sm:px-10 lg:px-20">
		<header class="border-ink/15 flex h-20 items-center justify-between border-b font-mono text-[10px] tracking-[0.12em] uppercase">
			<NuxtLink to="/" class="text-lg font-semibold tracking-[-0.035em]">ABD<span class="text-coral ml-0.5">·</span></NuxtLink>
			<div class="hidden gap-6 text-stone-500 sm:flex"><span>Lagos, NG</span><span>Available for select work</span></div>
			<NuxtLink to="#contact" class="hover:text-coral transition-colors">Contact <span class="text-coral">↗</span></NuxtLink>
		</header>

		<main>
			<section class="flex min-h-[calc(100svh-5rem)] flex-col justify-between py-10 sm:py-14 lg:py-16">
				<p class="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">Software engineer / builder / curious human</p>
				<div class="mt-12 grid items-end gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_240px]">
					<h1 class="text-[clamp(4rem,11vw,10.5rem)] leading-[0.86] font-medium tracking-[-0.095em]">
						{{ home?.header || "Abdullahi Odesanmi" }}<br /><em class="font-serif font-normal tracking-[-0.1em]">with care.</em>
					</h1>
					<div class="max-w-[220px] pb-2">
						<svg aria-hidden="true" class="text-coral mb-5 block h-8 w-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M16 2.5 18.4 13.6 29.5 16l-11.1 2.4L16 29.5l-2.4-11.1L2.5 16l11.1-2.4L16 2.5Z" fill="currentColor" />
							<circle cx="16" cy="16" r="3" fill="var(--color-paper)" />
						</svg>
						<p class="text-sm leading-relaxed">{{ home?.brief || "Thoughtful products, useful systems and the occasional beautiful rabbit hole." }}</p>
					</div>
				</div>
				<div class="mt-10 flex items-end justify-between gap-6 font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">
					<span>Scroll to explore <b class="text-ink pl-1 text-lg">↓</b></span
					><span class="text-ink text-right">06°26′N / 03°27′E</span>
				</div>
			</section>

			<section id="work" class="py-28 sm:py-36">
				<div class="border-ink grid grid-cols-[48px_1fr] gap-5 border-t pt-4 font-mono text-[10px] tracking-[0.12em] uppercase sm:grid-cols-[1fr_2fr_1fr]">
					<span>(01)</span>
					<h2 class="font-sans text-4xl leading-none font-medium tracking-[-0.07em] sm:text-6xl">Selected projects</h2>
					<span class="col-start-2 text-stone-500 sm:col-start-3 sm:justify-self-end">Things I’ve made</span>
				</div>
				<div class="border-ink/15 mt-16 border-t">
					<NuxtLink
						v-for="(project, index) in featuredProjects"
						:key="project.title"
						:to="projectUrl(project)"
						class="group border-ink/15 grid min-h-28 grid-cols-[34px_1fr_55px] items-center gap-2 border-b transition-colors hover:bg-white/50 sm:grid-cols-[1fr_2fr_1.5fr_.6fr_130px] sm:gap-0 sm:px-0 sm:hover:px-4"
					>
						<span class="font-mono text-[10px] text-stone-500">{{ String(index + 1).padStart(2, "0") }}</span
						><span class="text-2xl tracking-[-0.07em] sm:text-4xl">{{ project.title }}</span
						><span class="hidden font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase sm:block">{{ project.tags?.join(" / ") }}</span
						><span class="row-start-2 font-mono text-[10px] text-stone-500 sm:row-start-auto">{{ formatProjectDate(project.created_at) }}</span
						><span class="bg-ink/25 group-hover:bg-coral h-px w-10 justify-self-end transition-all group-hover:w-16 sm:w-16 sm:group-hover:w-24"></span>
					</NuxtLink>
				</div>
				<p class="mt-8 ml-0 text-sm leading-relaxed text-stone-500 sm:ml-[33.33%]">
					A small selection from a much larger archive.<br /><NuxtLink to="/projects" class="text-coral inline-flex items-center gap-1 hover:underline">
						Explore all projects
						<svg aria-hidden="true" viewBox="0 0 12 12" class="size-3" fill="none">
							<path d="M2.25 9.75 9.75 2.25M4.5 2.25h5.25V7.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.25" />
						</svg>
					</NuxtLink>
				</p>
			</section>

			<section class="-mx-6 grid gap-16 bg-[#171714] px-6 py-28 text-[#f2f0e9] sm:-mx-10 sm:px-10 lg:-mx-20 lg:grid-cols-[1fr_2fr] lg:px-20 lg:py-36">
				<p class="font-mono text-[10px] tracking-[0.12em] text-[#a9a79e] uppercase">A little context</p>
				<p class="max-w-3xl text-[clamp(2.2rem,5vw,4.6rem)] leading-[0.98] tracking-[-0.08em]">
					I like the space between a good idea and the moment it becomes <em class="font-serif font-normal text-[#e65d43]">real.</em>
				</p>
			</section>

			<section id="contact" class="py-24 sm:py-32">
				<div class="border-ink grid min-w-0 gap-10 border-t pt-4 lg:grid-cols-[1fr_2fr] lg:gap-16">
					<div class="flex justify-between font-mono text-[10px] tracking-[0.12em] uppercase lg:block">
						<span>(02) / Contact</span>
						<span class="text-stone-500 lg:mt-4 lg:block">Open to thoughtful work</span>
					</div>
					<div class="min-w-0">
						<h2 class="max-w-4xl text-[clamp(3rem,8vw,7.5rem)] leading-[0.88] font-medium tracking-[-0.085em]">
							Let’s make something <em class="text-coral font-serif font-normal">useful.</em>
						</h2>
						<div class="border-ink/15 mt-10 grid gap-8 border-t pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
							<p class="max-w-md text-sm leading-relaxed text-stone-500">Have a product, system, or idea that deserves careful engineering? Tell me what you’re working on.</p>
							<a
								href="mailto:abdulodesanmi@gmail.com"
								class="group border-ink hover:border-coral hover:text-coral inline-flex max-w-full min-w-0 items-center justify-between gap-5 rounded-full border px-5 py-4 font-mono text-[11px] tracking-[0.04em] transition-colors sm:text-xs"
							>
								<span class="min-w-0 break-all">abdulodesanmi@gmail.com</span>
								<span class="text-coral shrink-0 text-base transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
							</a>
						</div>
					</div>
				</div>
			</section>

			<section class="border-ink/15 border-t py-10 sm:py-14">
				<div class="grid gap-8 sm:grid-cols-[1fr_2fr] sm:gap-12">
					<p class="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">(03) / Credits</p>
					<div>
						<p class="max-w-2xl text-sm leading-relaxed text-stone-500">
							This site is my own work, developed with help from Codex by OpenAI. Its visual language was shaped by studying thoughtful details across these portfolios, with gratitude to
							the people who made them.
						</p>
						<!-- <NuxtLink to="/credits" class="text-coral mt-5 inline-block font-mono text-[10px] tracking-[0.08em] uppercase hover:underline">Read the full notes ↗</NuxtLink> -->
						<nav aria-label="Design inspiration credits" class="mt-6 flex flex-wrap gap-x-5 gap-y-3 font-mono text-[10px] tracking-[0.08em] uppercase">
							<a href="https://www.likandokayombo.com/" target="_blank" rel="noopener noreferrer" class="hover:text-coral transition-colors">Likando Kayombo ↗</a>
							<a href="https://animationsdev-microinteractions.vercel.app/" target="_blank" rel="noopener noreferrer" class="hover:text-coral transition-colors">Animations.dev ↗</a>
							<a href="https://ayanfe-olarinde.vinyldavyl.xyz/" target="_blank" rel="noopener noreferrer" class="hover:text-coral transition-colors">Ayanfe Olarinde ↗</a>
							<a href="https://www.adura.design/" target="_blank" rel="noopener noreferrer" class="hover:text-coral transition-colors">Adura ↗</a>
							<a href="https://devdami.live/" target="_blank" rel="noopener noreferrer" class="hover:text-coral transition-colors">DevDami ↗</a>
						</nav>
					</div>
				</div>
			</section>
		</main>
		<NowPlaying />

		<footer class="border-ink/15 grid min-h-20 grid-cols-2 items-center gap-4 border-t py-5 font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase sm:grid-cols-3">
			<span>© {{ currentYear }} Abdullahi Odesanmi</span>
			<div class="flex justify-end gap-4 sm:justify-center">
				<NuxtLink to="/projects">Projects</NuxtLink><NuxtLink to="/blog">Notes</NuxtLink><a href="https://github.com/realabdullah" target="_blank">GitHub ↗</a>
			</div>
			<span class="col-span-2 sm:col-span-1 sm:justify-self-end">Built with intention</span>
		</footer>
	</div>
</template>
