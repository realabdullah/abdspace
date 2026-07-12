<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;
const { data: project } = await useAsyncData(`project-${slug}`, async () => {
	const projects = await queryCollection("projects").all();
	const projectTitles: Record<string, string> = {
		audiophile: "Audiophile",
		damien: "Damien's Photography Portfolio (WIP 🚧)",
		drummersville: "Drummersville",
		"md-editor": "MD Editor",
		mocktail: "mockTail 🪄",
		"note-taking": "Note Taking",
		"smart-pass": "Smart Pass",
		taskgid: "Taskgid (WIP 🚧)",
		"taskgid-api": "Taskgid API",
		"webauthn-experiment": "WebAuthn Experiment",
		"x-o-battleground": "x-o-battleground",
		"x-o-battleground-server": "x-o-battleground ws server",
		"video-upload-demo": "Video Upload Demo",
		lifestack: "Lifestack",
		kudilog: "KudiLog",
		"spatial-web": "Spatial Web",
		"metrik-compass": "Metrik Compass",
		"context-window": "Context Window",
	};
	return projects.find((item) => {
		const normalizedTitle = item.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/-wip-?$/, "");
		return item.title === projectTitles[slug] || item.stem === slug || item.stem?.endsWith(`/${slug}`) || normalizedTitle === slug;
	});
});

if (!project.value) throw createError({ statusCode: 404, statusMessage: "Project not found" });
useSeoMeta({ title: `${project.value.title} — Abdullahi Odesanmi`, description: project.value.description, ogTitle: project.value.title, ogDescription: project.value.description });
defineOgImage("Portfolio", {
	title: project.value.title,
	description: project.value.description,
	section: "Project",
});
const projectDate = computed(() => formatProjectDate(project.value?.created_at, "long"));
const gallery = computed(() => project.value?.screenshots || []);
</script>

<template>
	<div class="mx-auto min-h-screen max-w-[1440px] px-6 sm:px-10 lg:px-20">
		<header class="border-ink/15 flex h-20 items-center justify-between border-b font-mono text-[10px] tracking-[0.12em] uppercase">
			<NuxtLink to="/projects" class="hover:text-coral transition-colors">← Projects</NuxtLink
			><NuxtLink to="/" class="text-lg font-semibold tracking-[-0.035em]">ABD<span class="text-coral ml-0.5">·</span></NuxtLink>
		</header>
		<main class="py-20 sm:py-28">
			<div class="border-ink grid gap-14 border-t pt-4 lg:grid-cols-[1fr_2fr]">
				<div class="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">
					<span class="block">(05) / Project</span><span class="mt-4 block">{{ projectDate }}</span
					><span v-if="project?.status" class="text-coral mt-4 block">{{ project.status }}</span>
				</div>
				<div>
					<h1 class="max-w-5xl text-[clamp(3.5rem,9vw,9rem)] leading-[0.86] font-medium tracking-[-0.095em]">{{ project?.title }}</h1>
					<p class="mt-12 max-w-2xl text-lg leading-relaxed text-stone-500">{{ project?.description }}</p>
				</div>
			</div>
			<div v-if="gallery.length" class="my-20 grid gap-4 sm:my-28 sm:grid-cols-2">
				<figure v-for="(image, index) in gallery" :key="image" class="bg-ink overflow-hidden rounded-[2rem]" :class="{ 'sm:col-span-2': index === 0 && gallery.length > 1 }">
					<img
						:src="image"
						:alt="project?.screenshot_captions?.[index] || `${project?.title} screenshot ${index + 1}`"
						class="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
						loading="lazy"
					/>
					<figcaption v-if="project?.screenshot_captions?.[index]" class="bg-ink px-5 py-4 font-mono text-[10px] tracking-[0.1em] text-stone-400 uppercase">
						{{ project.screenshot_captions[index] }}
					</figcaption>
				</figure>
			</div>
			<div v-else class="bg-ink text-paper my-20 rounded-[2rem] p-8 sm:my-28 sm:p-14">
				<div class="grid gap-12 sm:grid-cols-[1fr_2fr] sm:items-end">
					<div class="font-mono text-[10px] tracking-[0.12em] text-stone-400 uppercase">
						<svg aria-hidden="true" class="text-coral block h-7 w-7" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M16 2.5 18.4 13.6 29.5 16l-11.1 2.4L16 29.5l-2.4-11.1L2.5 16l11.1-2.4L16 2.5Z" fill="currentColor" />
							<circle cx="16" cy="16" r="3" fill="var(--color-paper)" />
						</svg>
						<span class="mt-6 block">Engineering notes</span>
					</div>
					<div>
						<p class="max-w-2xl text-[clamp(1.6rem,3vw,2.8rem)] leading-[1.05] tracking-[-0.06em]">A closer look at the systems, decisions, and details behind {{ project?.title }}.</p>
						<p class="mt-8 max-w-xl text-sm leading-relaxed text-stone-400">This project is best understood through its architecture and implementation rather than a visual gallery.</p>
					</div>
				</div>
			</div>
			<div v-if="project?.challenge || project?.approach || project?.learnings" class="border-ink/15 grid gap-10 border-t py-16 sm:grid-cols-3">
				<div v-if="project?.challenge">
					<p class="font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase">The challenge</p>
					<p class="mt-4 text-sm leading-relaxed">{{ project.challenge }}</p>
				</div>
				<div v-if="project?.approach">
					<p class="font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase">The approach</p>
					<p class="mt-4 text-sm leading-relaxed">{{ project.approach }}</p>
				</div>
				<div v-if="project?.learnings">
					<p class="font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase">What I learned</p>
					<p class="mt-4 text-sm leading-relaxed">{{ project.learnings }}</p>
				</div>
			</div>
			<div class="border-ink/15 grid gap-14 border-t pt-5 sm:grid-cols-[1fr_2fr]">
				<div class="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">Built with</div>
				<div>
					<div class="flex flex-wrap gap-2">
						<span v-for="tag in project?.tags" :key="tag" class="border-ink/15 border px-3 py-2 font-mono text-[10px] tracking-[0.08em] text-stone-500 uppercase">{{ tag }}</span>
					</div>
					<div v-if="project?.role || project?.outcome" class="mt-12 grid gap-8 sm:grid-cols-2">
						<div v-if="project?.role">
							<p class="font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase">Role</p>
							<p class="mt-3 text-sm leading-relaxed">{{ project.role }}</p>
						</div>
						<div v-if="project?.outcome">
							<p class="font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase">Outcome</p>
							<p class="mt-3 text-sm leading-relaxed">{{ project.outcome }}</p>
						</div>
					</div>
					<div class="text-coral mt-12 flex flex-wrap gap-6 font-mono text-[10px] tracking-[0.1em] uppercase">
						<a v-if="project?.live_url" :href="project.live_url" target="_blank" rel="noopener noreferrer">Visit live site ↗</a
						><a v-if="project?.github_url" :href="project.github_url" target="_blank" rel="noopener noreferrer">View source ↗</a>
					</div>
				</div>
			</div>
		</main>
		<footer class="border-ink/15 flex min-h-20 items-center justify-between border-t py-5 font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase">
			<NuxtLink to="/projects">← All projects</NuxtLink><NuxtLink to="/#contact">Start a conversation ↗</NuxtLink>
		</footer>
	</div>
</template>
