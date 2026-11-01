export const DIRECTIONS = [
	{ id: "paper", glyph: "紙", name: "paper", note: "ink on paper, the way it reads" },
	{ id: "tension", glyph: "張", name: "tension", note: "one taut line. pluck it" },
	{ id: "score", glyph: "譜", name: "score", note: "my years, played live" },
	{ id: "joinery", glyph: "継", name: "joinery", note: "the underside, and how it fits" },
	{ id: "dwell", glyph: "留", name: "dwell", note: "it settles when you do" },
] as const;

export type DirectionId = (typeof DIRECTIONS)[number]["id"];

const isDirection = (value: unknown): value is DirectionId => DIRECTIONS.some((direction) => direction.id === value);

/** Routes a room takes over. Articles stay on paper: reading is reading. */
const ROOM_ROUTES = new Set(["/", "/projects", "/writings"]);

export const useDirection = () => {
	// A cookie, not localStorage, so the server renders the right room and nothing flashes.
	const cookie = useCookie<string>("abdspace-direction", { default: () => "paper", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
	const route = useRoute();

	// ?room=score makes a room shareable; following the link also moves you in.
	const requested = route.query.room;
	if (isDirection(requested) && requested !== cookie.value) cookie.value = requested;

	const current = computed<DirectionId>(() => (isDirection(cookie.value) ? cookie.value : "paper"));
	const meta = computed(() => DIRECTIONS.find((direction) => direction.id === current.value)!);
	const inRoom = computed(() => current.value !== "paper" && ROOM_ROUTES.has(route.path.replace(/\/+$/, "") || "/"));

	/** Walking through: the next room opens out of a single horizontal line. */
	const go = async (next: DirectionId) => {
		if (next === current.value) return;
		const root = document.documentElement;
		const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
		const apply = async () => {
			cookie.value = next;
			if (route.query.room) await navigateTo({ query: { ...route.query, room: undefined } }, { replace: true });
			await nextTick();
		};

		if (!document.startViewTransition || reduceMotion) {
			await apply();
			return;
		}
		root.dataset.shift = "room";
		const transition = document.startViewTransition(apply);
		await transition.finished.finally(() => delete root.dataset.shift);
	};

	return { current, meta, inRoom, go };
};
