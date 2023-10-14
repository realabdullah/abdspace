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
	css: ["~/assets/sass/main.scss"],
	vite: {
		css: {
			preprocessorOptions: {
				scss: {
					additionalData: `
						@import "@/assets/sass/abstracts/_variables.scss"; 
						@import "@/assets/sass/abstracts/_mixins.scss";
					`,
				},
			},
		},
	},
	runtimeConfig: {
		public: {
			baseUrl: process.env.SITE_URL ?? "http://localhost:2000",
		},
	},
	devServer: {
		port: 2000,
	},
	devtools: { enabled: false },
});
