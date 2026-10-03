import { queryCollection } from "@nuxt/content/server";

export default defineEventHandler(async (event) => {
	const { url: base } = getSiteConfig(event);
	const posts = await queryCollection(event, "writings").select("slug", "createdAt").order("createdAt", "DESC").all();
	const day = (value: string) => new Date(value).toISOString().slice(0, 10);
	const latest = posts[0] && day(posts[0].createdAt);

	const pages: { loc: string; lastmod?: string }[] = [
		{ loc: `${base}/`, lastmod: latest },
		{ loc: `${base}/projects` },
		{ loc: `${base}/writings`, lastmod: latest },
		...posts.map((post) => ({ loc: `${base}/writings/${encodeURIComponent(post.slug)}`, lastmod: day(post.createdAt) })),
	];

	setHeader(event, "content-type", "application/xml; charset=utf-8");
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ loc, lastmod }) => `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
});
