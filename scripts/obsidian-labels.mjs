#!/usr/bin/env node
/**
 * Reads Obsidian's own translation tables out of the installed app.
 *
 * Two questions this answers, both of which are otherwise guesswork:
 *
 *   1. Which languages does Obsidian actually ship? That is the authority for
 *      which locales are worth translating into — a language the app has no
 *      UI for will read your translated plugin inside English chrome.
 *   2. What is Obsidian's own UI called in each of them? Documentation that
 *      quotes a host label must quote the label the user actually sees.
 *
 * The format: obsidian.asar contains i18n/mapping.txt, one dotted key per
 * line, and one <lang>.txt per locale where line N translates key N. An empty
 * line means untranslated, and that user sees English.
 *
 *   npm run labels                                    list locales
 *   npm run labels -- setting.file.option-...         one key in every locale
 *   npm run labels -- --grep "file extensions"        find a key by its English
 *
 * Two traps worth knowing before trusting the output. Not every locale has a
 * file at all — those users see English, and documentation for them should say
 * so rather than inventing a translation. And a locale file can be *staler
 * than the app*: where en-GB.txt disagrees with the base English compiled into
 * the bundle, the i18n file still wins for that locale, so both strings are
 * correct for different users.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, mkdtempSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

/** The app-updated asar in the config directory is what actually runs. */
function asarPath() {
	const config = join(homedir(), ".config", "obsidian");
	if (existsSync(config)) {
		const updated = readdirSync(config)
			.filter((f) => /^obsidian-[\d.]+\.asar$/.test(f))
			.sort();
		if (updated.length) return join(config, updated.at(-1));
	}
	for (const p of ["/usr/lib/obsidian/obsidian.asar", "/opt/Obsidian/resources/obsidian.asar"]) {
		if (existsSync(p)) return p;
	}
	return null;
}

const asar = asarPath();
if (!asar) {
	console.error("No obsidian.asar found. Pass a path: node scripts/obsidian-labels.mjs --asar <path>");
	process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), "obsidian-i18n-"));
const extract = (name) => {
	execFileSync("npx", ["--yes", "@electron/asar", "extract-file", asar, `i18n/${name}`], { cwd: dir, stdio: "pipe" });
	return readFileSync(join(dir, name), "utf8").split("\n");
};

const list = execFileSync("npx", ["--yes", "@electron/asar", "list", asar], { encoding: "utf8" })
	.split("\n")
	.map((l) => /^\/i18n\/(.+)\.txt$/.exec(l.trim())?.[1])
	.filter((n) => n && n !== "mapping");

const args = process.argv.slice(2);
const grep = args.includes("--grep") ? args[args.indexOf("--grep") + 1] : null;
const key = args.find((a) => a.includes(".") && !a.startsWith("--"));

if (!key && !grep) {
	console.log(`${asar}\n`);
	console.log(`${list.length} locales: ${list.sort().join(" ")}`);
	console.log("\nPass a key, or --grep <english text>, to see one string in every locale.");
	process.exit(0);
}

const keys = extract("mapping.txt");
const enGB = extract("en-GB.txt");

if (grep) {
	const hits = enGB
		.map((v, i) => ({ key: keys[i], value: v, i }))
		.filter((r) => r.value && r.value.toLowerCase().includes(grep.toLowerCase()));
	if (!hits.length) console.log(`nothing in en-GB matches "${grep}"`);
	for (const h of hits) console.log(`${h.key}\n    ${h.value}`);
	process.exit(0);
}

const index = keys.indexOf(key);
if (index < 0) {
	console.error(`key not found: ${key}`);
	process.exit(1);
}

console.log(`${key}\n`);
for (const locale of list.sort()) {
	const value = extract(`${locale}.txt`)[index];
	console.log(`  ${locale.padEnd(7)} ${value || "(empty — this locale sees English)"}`);
}
