import { queryCollection } from "@nuxt/content/server";

export default defineEventHandler(async (event) => {
	const base = "https://www.abdspace.xyz";
	const posts = await queryCollection(event, "writings").select("slug", "createdAt").all();
	const urls = [`${base}/`, `${base}/writings`, ...posts.map((post) => `${base}/writings/${post.slug}`)];

	setHeader(event, "content-type", "application/xml; charset=utf-8");
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>
`;
});
