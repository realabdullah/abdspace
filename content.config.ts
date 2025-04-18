import { defineContentConfig, defineCollection, z } from "@nuxt/content";

export default defineContentConfig({
	collections: {
		home: defineCollection({
			type: "page",
			source: "home/*.md",
			schema: z.object({
				header: z.string(),
				brief: z.string(),
				pillText: z.string(),
				pillColor: z.string(),
				links: z.array(
					z.object({
						name: z.string(),
						link: z.string(),
					})
				),
				navs: z.array(
					z.object({
						name: z.string(),
						link: z.string(),
					})
				),
			}),
		}),
	},
});
