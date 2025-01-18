// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	app: {
		head: {
			htmlAttrs: {
				lang: "en",
			},
			meta: [
				{
					name: "viewport",
					content: "width=device-width, initial-scale=1",
				},
				{
					charset: "utf-8",
				},
			],
		},
	},
	css: ["~/assets/css/main.css"],
	runtimeConfig: {
		public: {
			baseUrl: process.env.SITE_URL ?? "http://localhost:2000",
		},
	},
	devServer: {
		port: 2000,
	},
	devtools: { enabled: false },
	imports: {
		dirs: ["types/**/*"],
	},
	modules: ["@nuxtjs/supabase", "@nuxtjs/tailwindcss"],
	tailwindcss: {
		cssPath: ['~/assets/css/tailwind.css', { injectPosition: "first" }],
		config: {},
		viewer: true,
		exposeConfig: false,
	},
	supabase: {
		redirect: false,
	},
	compatibilityDate: "2025-01-18",
});