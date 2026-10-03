// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: ["@nuxt/content", "@nuxt/eslint", "@nuxt/fonts", "nuxt-og-image"],
	devtools: { enabled: true },
	app: {
		head: {
			charset: "utf-8",
			viewport: "width=device-width, initial-scale=1",
			meta: [{ name: "theme-color", content: "#f4f3ef" }],
			link: [
				{ rel: "icon", href: "/favicon.ico", sizes: "32x32" },
				{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
				{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
				{ rel: "manifest", href: "/site.webmanifest" },
			],
			script: [
				{
					// Runs before paint so the saved or system theme never flashes.
					innerHTML: `try{var t=localStorage.getItem("abdspace-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
				},
			],
		},
		pageTransition: { name: "page", mode: "out-in" },
	},
	css: ["~/assets/main.css"],
	site: {
		url: process.env.NUXT_SITE_URL || "https://www.abdspace.xyz",
		name: "Abdullahi Odesanmi",
		description: "I make interfaces for the web and care about the small things: how it moves, how it reads, how it feels to use.",
		defaultLocale: "en",
	},
	content: {
		// Node's built-in sqlite: no native binary to fall out of step with the runtime's Node version.
		experimental: { sqliteConnector: "native" },
		build: {
			markdown: {
				highlight: {
					theme: { default: "min-light", dark: "min-dark" },
					langs: ["json", "js", "ts", "html", "css", "vue", "shell", "bash", "md", "yaml", "diff", "graphql", "scss", "sql"],
				},
			},
		},
	},
	routeRules: {
		"/credits": { redirect: { to: "/", statusCode: 301 } },
	},
	compatibilityDate: "2026-10-01",
	eslint: {
		config: { stylistic: true },
		checker: true,
	},
	fonts: {
		families: [
			{ name: "Newsreader", weights: ["200 800"], styles: ["normal", "italic"] },
			{ name: "IBM Plex Mono", weights: [400, 500], styles: ["normal", "italic"] },
			{ name: "Shippori Mincho B1", weights: [500, 800] },
		],
	},
	ogImage: {
		defaults: { width: 1200, height: 630 },
	},
});
