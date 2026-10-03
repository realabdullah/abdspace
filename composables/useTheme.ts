const STORAGE_KEY = "abdspace-theme";
const THEME_COLORS = { light: "#f4f3ef", dark: "#0f0f0e" };

export const useTheme = () => {
	const isDark = useState("theme-is-dark", () => false);

	const apply = (dark: boolean) => {
		isDark.value = dark;
		const root = document.documentElement;
		root.classList.toggle("dark", dark);
		document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light);
		try {
			localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
		} catch {
			/* storage can be unavailable in private windows */
		}
	};

	/** Sync state with the class the inline head script already set. */
	const hydrate = () => {
		isDark.value = document.documentElement.classList.contains("dark");
	};

	/** Night falls in columns, top-down and right to left; day rises back the other way. */
	const toggle = () => {
		const next = !isDark.value;
		const root = document.documentElement;
		const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

		if (!document.startViewTransition || reduceMotion) {
			apply(next);
			return;
		}

		root.dataset.shift = next ? "dusk" : "dawn";
		const transition = document.startViewTransition(() => apply(next));
		transition.finished.finally(() => delete root.dataset.shift);
	};

	return { isDark, hydrate, toggle };
};
