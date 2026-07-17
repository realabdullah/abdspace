import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "content", ".remote-blog");
const localSource = process.env.BLOG_SOURCE_DIR || path.resolve(root, "../abdspace-blog/content/blog");
const repository = process.env.BLOG_REPO_URL || "https://github.com/realabdullah/abdspace-blog.git";
const ref = process.env.BLOG_REPO_REF || "master";
const token = process.env.BLOG_REPO_TOKEN;
const cloneUrl = token && repository.startsWith("https://github.com/") ? repository.replace("https://", `https://x-access-token:${encodeURIComponent(token)}@`) : repository;
let source = localSource;
let sourceCommit = "local";
let tempDir;

try {
	if (!existsSync(source)) {
		tempDir = path.join(os.tmpdir(), `abdspace-blog-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		execFileSync("git", ["clone", "--depth", "1", "--branch", ref, cloneUrl, tempDir], { stdio: "inherit" });
		source = path.join(tempDir, "content", "blog");
		sourceCommit = execFileSync("git", ["-C", tempDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
	} else if (existsSync(path.join(root, ".git"))) {
		try {
			sourceCommit = execFileSync("git", ["-C", path.dirname(source), "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
		} catch {
			/* local sibling source may not be a Git checkout yet */
		}
	}

	if (!existsSync(source)) throw new Error(`Blog source directory does not exist: ${source}`);
	const files = (await readdir(source)).filter((file) => file.endsWith(".md"));
	if (!files.length) throw new Error("Blog source contains no Markdown posts.");
	await rm(target, { recursive: true, force: true });
	await mkdir(target, { recursive: true });
	for (const file of files) await cp(path.join(source, file), path.join(target, file));
	await writeFile(path.join(root, ".blog-source.json"), JSON.stringify({ repository, ref, commit: sourceCommit, files }, null, 2) + "\n");
	console.log(`Synchronized ${files.length} blog posts from ${repository}@${sourceCommit}.`);
} finally {
	if (tempDir) await rm(tempDir, { recursive: true, force: true });
}
