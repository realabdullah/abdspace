export const DIRECTIONS = [
	{ id: "paper", glyph: "紙", name: "paper", note: "ink on paper, the way it reads", morph: false },
	{ id: "tension", glyph: "張", name: "tension", note: "one taut line. pluck it", morph: false },
	{ id: "score", glyph: "譜", name: "score", note: "my years, played live", morph: false },
	{ id: "joinery", glyph: "継", name: "joinery", note: "the underside, and how it fits", morph: false },
] as const;

export type DirectionId = (typeof DIRECTIONS)[number]["id"];

/** Where a visitor came in from: the point they clicked, so a room can begin there. */
export interface Arrival {
	x: number;
	y: number;
	at: number;
}

const isDirection = (value: unknown): value is DirectionId => DIRECTIONS.some((direction) => direction.id === value);

/** Routes a room takes over. Articles stay on paper: reading is reading. */
const ROOM_ROUTES = new Set(["/", "/projects", "/writings"]);

const SEED = "room-seed";

/** Resolves once the new room has put its seed element in the page, or gives up quietly. */
const waitForSeed = (timeout = 900) =>
	new Promise<HTMLElement | null>((resolve) => {
		const start = performance.now();
		const look = () => {
			const seed = document.querySelector<HTMLElement>("[data-room-seed]");
			if (seed || performance.now() - start > timeout) resolve(seed);
			else requestAnimationFrame(look);
		};
		look();
	});

export const useDirection = () => {
	// A cookie, not localStorage, so the server renders the right room and nothing flashes.
	const cookie = useCookie<string>("abdspace-direction", { default: () => "paper", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
	const arrival = useState<Arrival | null>("room-arrival", () => null);
	const route = useRoute();

	// ?room=score makes a room shareable; following the link also moves you in.
	const requested = route.query.room;
	if (isDirection(requested) && requested !== cookie.value) cookie.value = requested;

	const current = computed<DirectionId>(() => (isDirection(cookie.value) ? cookie.value : "paper"));
	const meta = computed(() => DIRECTIONS.find((direction) => direction.id === current.value)!);
	const inRoom = computed(() => current.value !== "paper" && ROOM_ROUTES.has(route.path.replace(/\/+$/, "") || "/"));

	/**
	 * Walking through. The older rooms open out of a single horizontal line.
	 * The newer ones morph out of the click: the glyph you chose flies to its place in the room,
	 * the room opens as a circle from that point, and the room itself starts its entrance there.
	 */
	const go = async (next: DirectionId, from?: { x: number; y: number; seed?: HTMLElement | null; onSwap?: () => void }) => {
		if (next === current.value) return;
		const root = document.documentElement;
		const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
		const morph = DIRECTIONS.find((direction) => direction.id === next)!.morph;
		const origin = from ?? { x: innerWidth - 40, y: 40 };
		arrival.value = { x: origin.x, y: origin.y, at: performance.now() };

		// Held in an object so TypeScript sees the assignment made inside the transition callback.
		const landed: { seed: HTMLElement | null } = { seed: null };
		const apply = async () => {
			if (from?.seed) from.seed.style.viewTransitionName = "";
			from?.onSwap?.();
			cookie.value = next;
			if (route.query.room) await navigateTo({ query: { ...route.query, room: undefined } }, { replace: true });
			await nextTick();
			if (morph) {
				landed.seed = await waitForSeed();
				if (landed.seed) landed.seed.style.viewTransitionName = SEED;
			}
		};

		if (!document.startViewTransition || reduceMotion) {
			await apply();
			if (landed.seed) landed.seed.style.viewTransitionName = "";
			return;
		}

		root.dataset.shift = morph ? "morph" : "room";
		if (morph && from?.seed) from.seed.style.viewTransitionName = SEED;
		const transition = document.startViewTransition(apply);

		if (morph) {
			transition.ready
				.then(() => {
					const reach = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
					root.animate(
						{ clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${reach}px at ${origin.x}px ${origin.y}px)`] },
						{ duration: 1100, easing: "cubic-bezier(0.7, 0, 0.15, 1)", pseudoElement: "::view-transition-new(root)", fill: "both" }
					);
				})
				.catch(() => {});
		}

		await transition.finished.finally(() => {
			delete root.dataset.shift;
			if (landed.seed) landed.seed.style.viewTransitionName = "";
			if (from?.seed) from.seed.style.viewTransitionName = "";
		});
	};

	return { current, meta, inRoom, go };
};

/** For a room's own entrance: the click it was entered from, or a sensible corner when someone lands directly. */
export const useRoomArrival = () => {
	const arrival = useState<Arrival | null>("room-arrival", () => null);
	return () => {
		const recent = arrival.value && performance.now() - arrival.value.at < 3000 ? arrival.value : null;
		arrival.value = null;
		return recent ?? { x: innerWidth - 48, y: 44, at: performance.now() };
	};
};
