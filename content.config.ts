import { defineContentConfig, defineCollection, z } from "@nuxt/content";

export default defineContentConfig({
	collections: {
		projects: defineCollection({
			type: "data",
			source: "projects/*.yml",
			schema: z.object({
				title: z.string(),
				about: z.string(),
				link: z.string().url(),
				featured: z.boolean().optional(),
				date: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "date must be a valid ISO date"),
			}),
		}),
		writings: defineCollection({
			type: "page",
			source: ".remote-writings/*.md",
			schema: z.object({
				title: z.string(),
				createdAt: z.string(),
				slug: z.string(),
				readTime: z.coerce.number(),
				brief: z.string(),
				description: z.string(),
			}),
		}),
	},
});
