import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "content", ".remote-blog");
const tracked = execFileSync("git", ["ls-files", "-z", "content/blog", "content/.remote-blog"], { encoding: "utf8" })
	.split("\0")
	.filter((file) => file && existsSync(path.join(root, file)))
	.join("\n");
if (tracked) throw new Error("Blog content must not be tracked in the portfolio repository. Publish it from blogs.abdspace.xyz/admin.");

const manifest = JSON.parse(await readFile(path.join(root, ".blog-source.json"), "utf8"));
const files = (await readdir(contentDir)).filter((file) => file.endsWith(".md"));
if (!files.length) throw new Error("No generated blog content is available.");
for (const file of files) {
	const body = await readFile(path.join(contentDir, file), "utf8");
	for (const field of ["title", "slug", "brief", "description", "createdAt", "readTime"]) {
		if (!new RegExp(`^${field}:\\s*.+$`, "m").test(body)) throw new Error(`Missing ${field} in generated blog post: ${file}`);
	}
}
if (manifest.files?.length !== files.length) throw new Error("Blog source manifest does not match generated content.");
console.log(`Blog source verified: ${manifest.repository}@${manifest.commit}.`);
