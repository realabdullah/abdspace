<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();

const isNotFound = computed(() => props.error.status === 404);
const statusCode = computed(() => props.error.status || 500);
const eyebrow = computed(() => (isNotFound.value ? "The trail ends here" : "A small interruption"));
const title = computed(() => (isNotFound.value ? "Nothing here." : "Something slipped."));
const description = computed(() =>
	isNotFound.value ? "This page may have moved, never existed, or taken an unexpected shortcut." : "The page ran into something unexpected. The rest of the work is still around."
);

useHead({ title: `${statusCode.value} — Abdullahi Odesanmi`, meta: [{ name: "robots", content: "noindex" }] });

const returnHome = async () => {
	await clearError({ redirect: "/" });
};
</script>

<template>
	<div class="bg-paper text-ink dark:bg-ink dark:text-paper relative min-h-screen overflow-hidden">
		<div class="border-coral/30 pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full border sm:h-[32rem] sm:w-[32rem]"></div>
		<div class="border-lime/20 pointer-events-none absolute -bottom-32 -left-24 h-64 w-64 rounded-full border sm:h-96 sm:w-96"></div>

		<header
			class="border-ink/15 relative z-10 mx-auto flex h-20 max-w-[1440px] items-center justify-between border-b px-6 font-mono text-[10px] tracking-[0.12em] uppercase sm:px-10 lg:px-20 dark:border-white/15"
		>
			<NuxtLink to="/" class="text-lg font-semibold tracking-[-0.035em]">ABD<span class="text-coral ml-0.5">·</span></NuxtLink>
			<span class="text-stone-500">Error / {{ statusCode }}</span>
		</header>

		<main class="relative z-10 mx-auto flex min-h-[calc(100svh-5rem)] max-w-[1440px] flex-col justify-between px-6 py-12 sm:px-10 sm:py-16 lg:px-20 lg:py-20">
			<div class="flex items-center gap-4 font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">
				<span class="text-coral">({{ statusCode }})</span>
				<span>{{ eyebrow }}</span>
			</div>

			<div class="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-end lg:gap-20">
				<div class="text-ink/10 font-mono text-[clamp(7rem,22vw,19rem)] leading-[0.7] tracking-[-0.14em] dark:text-white/10">{{ statusCode }}</div>
				<div>
					<h1 class="max-w-4xl text-[clamp(3.5rem,10vw,9rem)] leading-[0.84] font-medium tracking-[-0.1em]">{{ title }}</h1>
					<p class="mt-8 max-w-xl text-base leading-relaxed text-stone-400 sm:text-lg">{{ description }}</p>
					<div class="mt-10 flex flex-wrap items-center gap-6 font-mono text-[10px] tracking-[0.1em] uppercase">
						<button type="button" class="bg-paper text-ink hover:bg-coral hover:text-paper rounded-full px-5 py-4 transition-colors" @click="returnHome">Return home ↗</button>
						<NuxtLink to="/projects" class="text-coral hover:text-paper transition-colors">Browse the work →</NuxtLink>
					</div>
				</div>
			</div>

			<div class="border-ink/15 flex items-end justify-between gap-6 border-t pt-5 font-mono text-[10px] tracking-[0.1em] text-stone-500 uppercase dark:border-white/15">
				<span>ABD / Lagos, NG</span>
				<span class="text-right">Keep exploring<br />06°26′N / 03°27′E</span>
			</div>
		</main>
	</div>
</template>
