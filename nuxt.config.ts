// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
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
    devServer: {
		port: 2000,
	},
    devtools: { enabled: false }
})
