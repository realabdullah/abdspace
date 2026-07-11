<script setup lang="ts">
const slug = computed(() => useRoute().params.slug as string);
const { data: project } = await useAsyncData(`project-${slug.value}`, async () => {
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
	};
	return projects.find((item) => {
		const normalizedTitle = item.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/-wip-?$/, "");
		return (
			item.title === projectTitles[slug.value] || item.stem === slug.value || item.path?.endsWith(`/${slug.value}`) || item.path?.endsWith(`/${slug.value}.yml`) || normalizedTitle === slug.value
		);
	});
});
if (!project.value) throw createError({ statusCode: 404, statusMessage: "Project not found" });
useSeoMeta({ title: `${project.value.title} — Abdullahi Odesanmi`, description: project.value.description, ogTitle: project.value.title, ogDescription: project.value.description });
const year = computed(() => new Intl.DateTimeFormat("en", { year: "numeric" }).format(new Date(project.value?.created_at || "")));
const gallery = computed(() => project.value?.screenshots || []);
</script>

<template>
	<div class="mx-auto min-h-screen max-w-[1440px] px-6 sm:px-10 lg:px-20">
		<header class="border-ink/15 flex h-20 items-center justify-between border-b font-mono text-[10px] tracking-[0.12em] uppercase">
			<NuxtLink to="/projects" class="hover:text-coral transition-colors">← Work</NuxtLink
			><NuxtLink to="/" class="text-lg font-semibold tracking-[-0.035em]">ABD<span class="text-coral ml-0.5">·</span></NuxtLink>
		</header>
		<main class="py-20 sm:py-28">
			<div class="border-ink grid gap-14 border-t pt-4 lg:grid-cols-[1fr_2fr]">
				<div class="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">
					<span class="block">(05) / Project</span><span class="mt-4 block">{{ year }}</span
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
			<div v-else class="bg-ink text-paper my-20 grid min-h-[320px] place-items-center rounded-[2rem] p-8 text-center sm:my-28 sm:min-h-[480px]">
				<div>
					<span class="text-coral text-6xl">✳</span>
					<p class="mt-6 font-mono text-[10px] tracking-[0.12em] text-stone-400 uppercase">A closer look at {{ project?.title }}</p>
					<p class="mt-3 max-w-md text-sm leading-relaxed text-stone-400">Add screenshots and project stories through Nuxt Studio.</p>
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
