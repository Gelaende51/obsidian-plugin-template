#!/usr/bin/env node
/**
 * Turns the template into your plugin, then deletes itself.
 *
 *   npm run init
 *
 * Four jobs: rewrite the placeholders, remove subsystems you do not want, set
 * up git and the remote, and remove this script and the template's own README
 * so the new repository does not ship its scaffolding.
 *
 * The pruning matters more than it looks. The template ships everything on
 * purpose — opting out of something you can see beats opting in to something
 * you have to discover — but a plugin carrying a screenshot harness it never
 * uses is a plugin whose contributors wonder what it is for.
 *
 * Nothing is written until every answer is in, so quitting halfway leaves the
 * template exactly as it was.
 */
import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync, statSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q, fallback) => (await rl.question(`${q}${fallback ? ` [${fallback}]` : ""}: `)).trim() || fallback || "";
const yes = async (q) => /^y(es)?$/i.test((await rl.question(`${q} [Y/n]: `)).trim() || "y");

/** Placeholders are working values, not tokens, so the template builds as-is. */
const PLACEHOLDERS = {
	id: "my-plugin",
	name: "My Plugin",
	className: "TemplatePlugin",
	repo: "obsidian-my-plugin",
	owner: "TODO-OWNER",
	author: "TODO",
	cssPrefix: "my-plugin",
};

/**
 * Identifiers come from `.personal/personal.md` if it exists, never from the
 * template itself.
 *
 * A template that ships someone's GitHub account is a template that quietly
 * publishes plugins under it — the account name reaches manifest.json, the
 * README, the release workflow and the funding link, and each of those is a
 * place to forget. `.personal/` is excluded from git, so the answers stay on
 * the machine that has them.
 */
function readPersonal() {
	const path = join(root, ".personal", "personal.md");
	if (!existsSync(path)) return {};
	const text = readFileSync(path, "utf8");
	const field = (name) => new RegExp(`^\\s*[-*]\\s*${name}\\s*:\\s*(.+)$`, "im").exec(text)?.[1]?.trim();
	const value = (v) => (v && !/^<.*>$/.test(v) ? v : undefined);
	return {
		author: value(field("pseudonym")),
		owner: value(field("github")),
		funding: value(field("funding")),
		fundingLabel: value(field("funding-label")),
	};
}

const personal = readPersonal();

const SUBSYSTEMS = {
	i18n: {
		label: "Localisation (t(), locale table, translated docs)",
		files: ["src/lang", "scripts/check-translations.mjs", "scripts/i18n-selector.mjs", "scripts/i18n-stamp.mjs", "scripts/newlocale.mjs", "scripts/obsidian-labels.mjs", "docs/i18n"],
		scripts: ["check:lang", "newlocale", "stamp", "labels"],
	},
	harness: {
		label: "Live-app test harness (CDP)",
		files: [".dev/cdp.mjs", ".dev/cdpSession.mjs", ".dev/cdpSession.mjs", ".dev/restart-obsidian.sh", ".dev/test-harness.mjs"],
		scripts: [],
	},
	docs: {
		label: "Documentation integrity checks (links, structure)",
		files: ["scripts/check-links.mjs", "scripts/check-docs-shape.mjs"],
		scripts: ["check:docs"],
	},
	screenshots: {
		label: "Screenshot capture and AI-disclosure figures",
		files: [".dev/screenshots.mjs", ".dev/usage-stats.mjs"],
		scripts: [],
	},
};

console.log("\nTemplate setup. Enter to accept a default.\n");

const id = await ask("Plugin id (kebab-case, matches the folder in .obsidian/plugins)", PLACEHOLDERS.id);
const name = await ask("Display name", id.replace(/(^|-)(\w)/g, (_, s, c) => (s ? " " : "") + c.toUpperCase()));
const description = await ask("Description (one sentence, ends in a full stop)", "");
const author = await ask("Author", personal.author);
const owner = await ask("GitHub owner", personal.owner);
const repo = await ask("Repository name", `obsidian-${id}`);
const desktopOnly = await yes("Desktop only? (yes if it touches Node or Electron)");

console.log("\nSubsystems — everything is on; answer n to remove one.\n");
const keep = {};
for (const [key, sub] of Object.entries(SUBSYSTEMS)) keep[key] = await yes(`  keep ${sub.label}?`);

const doGit = await yes("\nInitialise git and make the first commit?");
const doRemote = doGit && (await yes(`Create ${owner}/${repo} on GitHub (private) and push?`));
rl.close();

const className = name.replace(/[^A-Za-z0-9]/g, "") || "TemplatePlugin";
const subs = [
	[PLACEHOLDERS.repo, repo],
	[PLACEHOLDERS.className, className],
	[PLACEHOLDERS.name, name],
	[PLACEHOLDERS.id, id],
	[PLACEHOLDERS.owner, owner],
	[PLACEHOLDERS.author, author],
];

/** Every text file except the ones that are not ours to rewrite. */
function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		if (["node_modules", ".git", "main.js", "LICENSE", "package-lock.json"].includes(entry)) continue;
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) walk(path, out);
		else if (/\.(ts|tsx|mjs|js|json|md|css|yml|yaml|sh)$/.test(entry)) out.push(path);
	}
	return out;
}

console.log("\nrewriting placeholders…");
for (const file of walk(root)) {
	const before = readFileSync(file, "utf8");
	let after = before;
	for (const [from, to] of subs) after = after.split(from).join(to);
	if (after !== before) writeFileSync(file, after);
}

// Description and desktop-only are structured fields, not text substitutions.
for (const [file, patch] of [
	["manifest.json", (j) => ({
		...j,
		description: description || j.description,
		isDesktopOnly: desktopOnly,
		version: "0.1.0",
		authorUrl: `https://github.com/${owner}`,
		// Omitted entirely rather than left as a placeholder: a funding link
		// pointing at example.com is worse than no funding link.
		...(personal.funding ? { fundingUrl: { [personal.fundingLabel ?? "Donate"]: personal.funding } } : { fundingUrl: undefined }),
	})],
	["package.json", (j) => ({ ...j, description: description || j.description })],
]) {
	const path = join(root, file);
	const json = JSON.parse(readFileSync(path, "utf8"));
	writeFileSync(path, JSON.stringify(patch(json), null, "\t") + "\n");
}

const removedScripts = [];
for (const [key, sub] of Object.entries(SUBSYSTEMS)) {
	if (keep[key]) continue;
	console.log(`removing ${key}…`);
	for (const rel of sub.files) rmSync(join(root, rel), { recursive: true, force: true });
	removedScripts.push(...sub.scripts);
}

if (removedScripts.length) {
	const path = join(root, "package.json");
	const pkg = JSON.parse(readFileSync(path, "utf8"));
	for (const s of removedScripts) delete pkg.scripts[s];
	// The build chain names the checks it runs, so a removed one must come out
	// of it too or every build fails on a script that no longer exists.
	pkg.scripts.build = pkg.scripts.build
		.split(" && ")
		.filter((step) => !removedScripts.some((s) => step.includes(`run ${s}`)))
		.join(" && ");
	writeFileSync(path, JSON.stringify(pkg, null, "\t") + "\n");
}

// The template's own README describes the template. The new plugin needs its
// own, and README.plugin.md is the starting point it ships for that.
const pluginReadme = join(root, "README.plugin.md");
if (existsSync(pluginReadme)) {
	rmSync(join(root, "README.md"), { force: true });
	writeFileSync(join(root, "README.md"), readFileSync(pluginReadme, "utf8"));
	rmSync(pluginReadme, { force: true });
}

rmSync(join(root, "scripts/init.mjs"), { force: true });
{
	const path = join(root, "package.json");
	const pkg = JSON.parse(readFileSync(path, "utf8"));
	delete pkg.scripts.init;
	writeFileSync(path, JSON.stringify(pkg, null, "\t") + "\n");
}

if (doGit) {
	console.log("setting up git…");
	const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
	try { git("rev-parse", "--git-dir"); } catch { git("init", "-b", "main"); }
	git("add", "-A");
	git("commit", "-m", `${name}: initial commit from template`);
	if (doRemote) {
		try {
			execFileSync("gh", ["repo", "create", `${owner}/${repo}`, "--private", "--source=.", "--remote=origin", "--description", description || name], { cwd: root, stdio: "inherit" });
			git("push", "-u", "origin", "main");
		} catch {
			console.log(`\n  gh failed — create ${owner}/${repo} by hand and:`);
			console.log(`    git remote add origin git@github.com:${owner}/${repo}.git && git push -u origin main`);
		}
	}
}

console.log(`\n${name} is ready.\n`);
console.log("  npm run build          type check, lint, bundle");
console.log("  npm run check:minapp   what your API usage actually requires");
if (keep.harness) console.log("  node .dev/test-harness.mjs   prove the harness before writing tests");
console.log("\nPut a test vault in .personal/ — keep a distinctive name, the harness picks");
console.log("its window by it — and symlink main.js, manifest.json and styles.css into");
console.log("its .obsidian/plugins/" + id + "/ folder.");
if (!existsSync(join(root, ".personal", "personal.md"))) {
	console.log("\nNo .personal/personal.md — see .personal/README.md. It pre-fills these");
	console.log("questions next time, and keeps your accounts out of the repository.");
}
