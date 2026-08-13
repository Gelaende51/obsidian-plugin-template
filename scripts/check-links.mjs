#!/usr/bin/env node
/**
 * Every relative link and #anchor in the documentation resolves.
 *
 * Worth automating because nothing else catches it: a broken anchor in one of
 * forty translated files is invisible to review and invisible to the build,
 * and only shows up as a reader landing at the top of the wrong page.
 *
 * The slug rules are GitHub's, and two of them bite in non-English documents:
 * combining marks (\p{M}) are *kept*, so Bengali, Devanagari, Khmer and Thai
 * headings depend on them; while U+2018 and U+200C are *stripped*, so an Uzbek
 * heading `Sarlavhadagi yo'l` slugs to `sarlavhadagi-yol`.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const slug = (heading) =>
	heading
		.toLowerCase()
		.replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
		.trim()
		.replace(/\s+/g, "-");

/** Every anchor a file defines, with GitHub's -1/-2 suffixes for duplicates. */
function anchors(path) {
	const set = new Set();
	const seen = {};
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const m = /^#{1,6}\s+(.*)$/.exec(line);
		if (!m) continue;
		const s = slug(m[1].replace(/[*_`]/g, ""));
		seen[s] = (seen[s] ?? 0) + 1;
		set.add(seen[s] === 1 ? s : `${s}-${seen[s] - 1}`);
	}
	return set;
}

const files = [];
(function walk(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		// .personal holds the test vault, whose notes are the user's own writing
		// with their own links — not documentation this repository is asserting
		// anything about.
		if (["node_modules", ".git", ".personal"].includes(entry.name)) continue;
		const path = `${dir}/${entry.name}`;
		if (entry.isDirectory()) walk(path);
		else if (entry.name.endsWith(".md")) files.push(path);
	}
})(root.replace(/\/$/, ""));

let broken = 0;
let checked = 0;
for (const file of files) {
	// Code fences hold example links that are not meant to resolve.
	const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
	for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
		const href = m[1];
		// Any scheme at all — https:, mailto:, obsidian: — is somebody else's
		// problem. Matching only http was how obsidian:// links got reported.
		if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
		checked++;
		const [path, hash] = href.split("#");
		const target = path ? resolve(dirname(file), path) : file;
		if (!existsSync(target)) {
			console.log(`missing file   ${relative(root, file)} -> ${href}`);
			broken++;
			continue;
		}
		if (hash && !anchors(target).has(decodeURIComponent(hash).toLowerCase())) {
			console.log(`broken anchor  ${relative(root, file)} -> ${href}`);
			broken++;
		}
	}
}

console.log(`${checked} relative links across ${files.length} documents, ${broken} broken`);
process.exit(broken ? 1 : 0);
