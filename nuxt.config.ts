// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	modules: ["@nuxt/content", "@nuxt/eslint", "@nuxt/fonts", "@nuxt/image", "@nuxt/icon"],
	devtools: { enabled: true },
	css: ["~/assets/main.css"],
	content: {
		preview: {
			api: "https://api.nuxt.studio",
		},
		build: {
			markdown: {
				highlight: {
					theme: {
						default: "vitesse-light",
						dark: "vitesse-black",
					},
					langs: [
						"json",
						"js",
						"ts",
						"html",
						"css",
						"vue",
						"shell",
						"mdc",
						"md",
						"yaml",
						"markdown",
						"bash",
						"diff",
						"graphql",
						"javascript",
						"json",
						"markdown",
						"scss",
						"sql",
						"typescript",
						"yaml",
					],
				},
			},
		},
	},
	compatibilityDate: "2024-11-01",
	vite: {
		plugins: [tailwindcss()],
	},
	eslint: {
		config: {
			stylistic: true,
		},
		checker: true,
	},
});
