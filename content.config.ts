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
		blog: defineCollection({
			type: "page",
			source: ".remote-blog/*.md",
			schema: z.object({
				title: z.string(),
				createdAt: z.string(),
				slug: z.string(),
				readTime: z.coerce.number(),
				brief: z.string(),
				description: z.string(),
			}),
		}),
		projectsPage: defineCollection({
			type: "page",
			source: "projects/**.md",
			schema: z.object({
				header: z.string(),
				subheader: z.string(),
				nav: z.object({
					text: z.string(),
					link: z.string(),
				}),
			}),
		}),
		projects: defineCollection({
			type: "data",
			source: "projects/**.yml",
			schema: z.object({
				title: z.string(),
				description: z.string(),
				role: z.string().optional(),
				outcome: z.string().optional(),
				challenge: z.string().optional(),
				approach: z.string().optional(),
				learnings: z.string().optional(),
				status: z.string().optional(),
				hero_image: z.string().optional(),
				screenshots: z.array(z.string()).optional(),
				screenshot_captions: z.array(z.string()).optional(),
				live_url: z.string().optional(),
				github_url: z.string().optional(),
				tags: z.array(z.string()),
				created_at: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "created_at must be a valid ISO date"),
			}),
		}),
	},
});
