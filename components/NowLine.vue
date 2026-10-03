<script setup lang="ts">
interface Playback {
	isPlaying: boolean;
	isConfigured: boolean;
	fetchedAt?: number;
	track?: { title: string; artist: string; url: string; progress: number; duration: number };
}

const { data, refresh } = useFetch<Playback>("/api/playing", {
	server: false,
	lazy: true,
	default: () => ({ isPlaying: false, isConfigured: false }),
});

const now = ref(0);
const mounted = ref(false);
let tick: ReturnType<typeof setInterval> | undefined;
let poll: ReturnType<typeof setInterval> | undefined;

const onVisible = () => document.visibilityState === "visible" && refresh();

onMounted(() => {
	now.value = Date.now();
	mounted.value = true;
	tick = setInterval(() => (now.value = Date.now()), 1000);
	poll = setInterval(refresh, 30_000);
	document.addEventListener("visibilitychange", onVisible);
});
onUnmounted(() => {
	clearInterval(tick);
	clearInterval(poll);
	document.removeEventListener("visibilitychange", onVisible);
});

const localTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const clock = computed(() => (mounted.value ? localTime.format(now.value) : ""));
const lateNight = computed(() => {
	const hour = Number(clock.value.slice(0, 2));
	return hour >= 0 && hour < 5;
});

const track = computed(() => data.value?.track);
const playing = computed(() => Boolean(data.value?.isPlaying && track.value));
const elapsed = computed(() => {
	const t = track.value;
	if (!t) return 0;
	const drift = playing.value && data.value?.fetchedAt ? Math.max(0, now.value - data.value.fetchedAt) : 0;
	return Math.min(t.duration, t.progress + drift);
});
const progress = computed(() => (track.value ? (elapsed.value / track.value.duration) * 100 : 0));

const lead = computed(() => {
	if (playing.value) return lateNight.value ? ", and I’m still up, listening to " : ", and I’m listening to ";
	if (track.value) return ". I just paused ";
	return lateNight.value ? ". I’m probably asleep." : ". Nothing’s playing, so I’m probably deep in something.";
});

// Once the song should have ended, ask again rather than sit at 100%.
watch(
	() => track.value && elapsed.value >= track.value.duration,
	(ended) => ended && refresh()
);
</script>

<template>
	<p class="now" :class="{ 'is-ready': mounted }">
		<template v-if="mounted">
			It’s <time class="mono now__clock">{{ clock }}</time> for me{{ lead
			}}<template v-if="track"
				><a :href="track.url" target="_blank" rel="noopener noreferrer" class="now__track" :style="{ '--progress': `${progress}%` }">{{ track.title }}</a> by {{ track.artist }}.</template
			><span v-if="playing && track" class="mono muted now__time">{{ formatDuration(elapsed) }} / {{ formatDuration(track.duration) }}</span>
		</template>
		<template v-else>&nbsp;</template>
	</p>
</template>

<style scoped>
.now {
	max-width: 36rem;
	font-size: 1.125rem;
	line-height: 1.6;
	color: var(--muted);
	opacity: 0;
	transition: opacity 700ms ease;
}
.now.is-ready {
	opacity: 1;
}
.now__clock {
	font-size: 0.9em;
	color: var(--fg);
}
/* The underline is the song: it fills as the track plays. */
.now__track {
	color: var(--fg);
	font-style: italic;
	background:
		linear-gradient(currentColor, currentColor) no-repeat 0 100% / var(--progress, 0%) 1px,
		linear-gradient(var(--faint), var(--faint)) no-repeat 0 100% / 100% 1px;
	padding-bottom: 2px;
	transition: background-size 1s linear;
}
.now__time {
	white-space: nowrap;
	margin-left: 0.5rem;
}
</style>
