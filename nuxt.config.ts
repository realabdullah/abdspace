// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	modules: ["@nuxt/content", "@nuxt/eslint", "@nuxt/fonts", "@nuxt/image", "@nuxt/icon", "nuxt-og-image"],
	devtools: { enabled: true },
	app: {
		head: {
			charset: "utf-8",
			viewport: "width=device-width, initial-scale=1",
			meta: [{ name: "theme-color", content: "#f2f0e9" }],
			script: [
				{
					innerHTML: `try{if(localStorage.getItem("abdspace-theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}`,
				},
			],
		},
	},
	css: ["~/assets/main.css"],
	site: {
		url: process.env.NUXT_SITE_URL || "https://www.abdspace.xyz",
		name: "Abdullahi Odesanmi",
	},
	content: {
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
	fonts: {
		families: [
			{ name: "Manrope", weights: [400, 500, 600, 700] },
			{ name: "DM Mono", weights: [400, 500] },
		],
	},
});
