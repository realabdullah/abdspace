// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	app: {
		head: {
		  htmlAttrs: {
			lang: "en",
		  },
		  title: "Abdullahi O. — Frontend Engineer",
		  meta: [
			{
			  name: "viewport",
			  content: "width=device-width, initial-scale=1",
			},
			{
			  charset: "utf-8",
			},
			{
				name: "title",
				content: "Abdullahi O. — Frontend Engineer",
			},
			{
			  name: "description",
			  content:
				"A Frontend Engineer with passion for building beautiful and functional user interfaces.",
			},
			{
				property: "og:type",
				content: "Website"
			},
			{
				property: "og:url",
				content: "https://abd.brimble.app/"
			},
			{
				property: "og:title",
				content: "Abdullahi O. — Frontend Engineer"
			},
			{
				property: "og:description",
				content: "A Frontend Engineer with passion for building beautiful and functional user interfaces."
			},
			{
				property: "og:image",
				content: "https://res.cloudinary.com/dxvhsze0l/image/upload/w_1000,ar_16:9,c_fill,g_auto,e_sharpen/v1694834839/website/wbh3unrtssz9mmbxcgl3.jpg"
			},
			{
				property: "twitter:card",
				content: "summary_large_image"
			},
			{
				property: "twitter:url",
				content: "https://res.cloudinary.com/dxvhsze0l/image/upload/w_1000,ar_16:9,c_fill,g_auto,e_sharpen/v1694834839/website/wbh3unrtssz9mmbxcgl3.jpg"
			},
			{
				property: "twitter:title",
				content: "Abdullahi O. — Frontend Engineer"
			},
			{
				property: "twitter:description",
				content: "A Frontend Engineer with passion for building beautiful and functional user interfaces."
			},
			{
				property: "twitter:image",
				content: "https://res.cloudinary.com/dxvhsze0l/image/upload/w_1000,ar_16:9,c_fill,g_auto,e_sharpen/v1694834839/website/wbh3unrtssz9mmbxcgl3.jpg"
			}
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
    devServer: {
		port: 2000,
	},
    devtools: { enabled: false }
})
