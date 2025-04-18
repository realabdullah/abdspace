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
			source: "blog/*.md",
			schema: z.object({
				title: z.string(),
				createdAt: z.string(),
				slug: z.string(),
				readTime: z.string(),
				brief: z.string(),
				meta: z.object({
					title: z.string(),
					description: z.string(),
					header: z.string(),
					subheader: z.string(),
					nav: z.object({
						text: z.string(),
						link: z.string(),
					}),
				}),
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
				live_url: z.string().optional(),
				github_url: z.string().optional(),
				tags: z.array(z.string()),
				created_at: z.string(),
			}),
		}),
	},
});
