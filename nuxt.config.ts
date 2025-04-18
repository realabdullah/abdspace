// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	modules: ["@nuxt/content", "@nuxt/eslint", "@nuxt/fonts", "@nuxt/image", "@nuxt/icon"],
	devtools: { enabled: true },
	css: ["~/assets/main.css"],
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
