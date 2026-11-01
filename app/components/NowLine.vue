<script setup lang="ts">
const { ready: mounted, clock, lateNight, track, playing, elapsed, progress: fraction } = useNowPlaying();
const progress = computed(() => fraction.value * 100);

const lead = computed(() => {
	if (playing.value) return lateNight.value ? ", and I’m still up, listening to " : ", and I’m listening to ";
	if (track.value) return ". I just paused ";
	return lateNight.value ? ". I’m probably asleep." : ". Nothing’s playing, so I’m probably deep in something.";
});
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
