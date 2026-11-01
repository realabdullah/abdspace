export interface Playback {
	isPlaying: boolean;
	isConfigured: boolean;
	fetchedAt?: number;
	track?: { title: string; artist: string; url: string; progress: number; duration: number };
}

const localTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// One poll and one clock however many components listen; they stop when the last one unmounts.
let listeners = 0;
let tick: ReturnType<typeof setInterval> | undefined;
let poll: ReturnType<typeof setInterval> | undefined;
let onVisible: (() => void) | undefined;

export const useNowPlaying = () => {
	const data = useState<Playback>("now-playing", () => ({ isPlaying: false, isConfigured: false }));
	const now = useState("now-playing-clock", () => 0);
	const ready = useState("now-playing-ready", () => false);

	const refresh = async () => {
		try {
			data.value = await $fetch<Playback>("/api/playing");
		} catch {
			/* keep the last known state; the next poll will try again */
		}
	};

	onMounted(() => {
		if (listeners++ > 0) return;
		now.value = Date.now();
		ready.value = true;
		refresh();
		tick = setInterval(() => (now.value = Date.now()), 1000);
		poll = setInterval(refresh, 30_000);
		onVisible = () => document.visibilityState === "visible" && refresh();
		document.addEventListener("visibilitychange", onVisible);
	});
	onUnmounted(() => {
		if (--listeners > 0) return;
		clearInterval(tick);
		clearInterval(poll);
		if (onVisible) document.removeEventListener("visibilitychange", onVisible);
	});

	const clock = computed(() => (ready.value ? localTime.format(now.value) : ""));
	const lateNight = computed(() => {
		const hour = Number(clock.value.slice(0, 2));
		return clock.value !== "" && hour >= 0 && hour < 5;
	});
	const track = computed(() => data.value.track);
	const playing = computed(() => Boolean(data.value.isPlaying && track.value));
	const elapsed = computed(() => {
		const t = track.value;
		if (!t) return 0;
		const drift = playing.value && data.value.fetchedAt ? Math.max(0, now.value - data.value.fetchedAt) : 0;
		return Math.min(t.duration, t.progress + drift);
	});
	/** 0–1 through the current song. */
	const progress = computed(() => (track.value ? elapsed.value / track.value.duration : 0));

	// Once the song should have ended, ask again rather than sit at the end.
	watch(
		() => track.value && elapsed.value >= track.value.duration,
		(ended) => ended && refresh()
	);

	/** The words between the clock and the track, shared so every view says it the same way. */
	const lead = computed(() => {
		if (playing.value) return lateNight.value ? ", and I’m still up, listening to " : ", and I’m listening to ";
		if (track.value) return ". I just paused ";
		return lateNight.value ? ". I’m probably asleep." : ". Nothing’s playing, so I’m probably deep in something.";
	});

	return { ready, clock, lateNight, track, playing, elapsed, progress, lead, refresh };
};
