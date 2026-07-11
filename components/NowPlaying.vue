<script setup lang="ts">
interface PlaybackResponse {
	isPlaying: boolean;
	isConfigured: boolean;
	track?: {
		title: string;
		artist: string;
		url: string;
		artwork?: string;
	};
}

const { data, refresh } = useFetch<PlaybackResponse>("/api/playing", {
	server: false,
	lazy: true,
	default: () => ({ isPlaying: false, isConfigured: true }),
});

let refreshTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => (refreshTimer = setInterval(refresh, 30_000)));
onUnmounted(() => clearInterval(refreshTimer));
</script>

<template>
	<div class="border-ink/15 grid min-w-0 gap-4 border-t py-5 font-mono text-[10px] tracking-[0.1em] uppercase sm:grid-cols-[1fr_2fr] sm:items-center">
		<div class="flex items-center gap-2 text-stone-500">
			<span class="relative flex h-2 w-2">
				<span v-if="data?.isPlaying" class="bg-coral absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"></span>
				<span class="relative inline-flex h-2 w-2 rounded-full" :class="data?.isPlaying ? 'bg-coral' : 'bg-ink/20'"></span>
			</span>
			{{ data?.isPlaying ? "Now playing" : "Spotify is quiet" }}
		</div>
		<a v-if="data?.isPlaying && data.track" :href="data.track.url" target="_blank" rel="noopener noreferrer" class="group flex min-w-0 items-center gap-3 sm:justify-self-end">
			<img v-if="data.track.artwork" :src="data.track.artwork" alt="" class="h-9 w-9 shrink-0 rounded object-cover" />
			<span class="min-w-0 normal-case">
				<span class="text-ink block truncate text-xs tracking-normal">{{ data.track.title }}</span>
				<span class="mt-0.5 block truncate text-[9px] text-stone-500">{{ data.track.artist }}</span>
			</span>
			<span class="text-coral shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
		</a>
		<span v-else class="tracking-normal text-stone-400 normal-case sm:justify-self-end">Check back when the headphones are on.</span>
	</div>
</template>
