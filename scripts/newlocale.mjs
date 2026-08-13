#!/usr/bin/env node
/**
 * Scaffolds a locale across the plugin's strings and its documentation.
 *
 *   npm run newlocale -- de
 *
 * Adding a language is three edits in three places, and doing them by hand
 * means eventually doing two of them. This does all three and leaves the
 * fourth — the actual translating — clearly unfinished, so `check:lang` fails
 * until it is done. A half-added language should not be able to ship.
 *
 * Which codes are valid comes from Obsidian itself: a language the app has no
 * UI for would read your translated plugin inside English chrome. Run
 * `npm run labels` to see the list the installed app ships.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { LANGUAGES } from "./i18n-selector.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const code = process.argv[2];

if (!code) {
	console.error("Usage: npm run newlocale -- <code>\n");
	console.error("Codes Obsidian ships:");
	console.error("  " + LANGUAGES.map(([c]) => c).filter((c) => c !== "en").join(" "));
	process.exit(2);
}

const entry = LANGUAGES.find(([c]) => c === code);
if (!entry) {
	console.error(`"${code}" is not a language Obsidian ships.`);
	console.error("Run `npm run labels` to check against the installed app.");
	process.exit(1);
}
const [, nativeName] = entry;

// 1. The runtime string table.
const translationsPath = `${root}src/lang/translations.ts`;
const translations = readFileSync(translationsPath, "utf8");
const key = /^[a-z]+$/.test(code) ? code : `"${code}"`;
if (translations.includes(`\n\t${key}: {`)) {
	console.error(`${code} already exists in translations.ts`);
	process.exit(1);
}
const strings = readFileSync(`${root}src/lang/strings.ts`, "utf8");
const stringKeys = [...strings.matchAll(/^\t([A-Za-z_$][\w$]*):/gm)].map((m) => m[1]);
const block =
	`\t${key}: {\n` +
	stringKeys.map((k) => `\t\t${k}: "",`).join("\n") +
	`\n\t},\n`;
writeFileSync(
	translationsPath,
	translations.replace(/(export const TRANSLATIONS[^=]*= \{)\n?/, (m, head) => `${head}\n${block}`),
);

// 2. The documentation pages, seeded with the English body to translate over.
//    A freshness header records the commit the English was taken from, so
//    `git log <hash>..HEAD -- <source>` later shows exactly what this file is
//    missing. Without it a translation set rots silently.
let head = "unknown";
try {
	head = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
} catch {
	// Not a git repository yet — the placeholder is honest and gets replaced
	// by the next stamp.
}
mkdirSync(`${root}docs/i18n`, { recursive: true });

// Localisation starts here, so this is where the English sources gain their
// language line. `i18n-stamp` only ever replaces an existing one — it must not
// insert into a document that never opted in.
for (const source of [`${root}README.md`, `${root}docs/usage.md`]) {
	if (!existsSync(source)) continue;
	const text = readFileSync(source, "utf8");
	if (!/^(?:\{\{SELECTOR\}\}|\*\*[^*\n]+\*\* )/.test(text)) {
		writeFileSync(source, `{{SELECTOR}}\n\n${text}`);
	}
}
for (const [doc, source] of [["README", `${root}README.md`], ["usage", `${root}docs/usage.md`]]) {
	const target = `${root}docs/i18n/${doc}.${code}.md`;
	if (existsSync(target) || !existsSync(source)) continue;
	const body = readFileSync(source, "utf8").replace(/^\*\*[^\n]*\n\n/, "");
	writeFileSync(
		target,
		`<!-- Translation of ${doc === "README" ? "README.md" : "docs/usage.md"} — status: commit ${head}.\n` +
			`     Machine-translated and unreviewed by native speakers. Plugin labels come\n` +
			`     from src/lang/translations.ts; Obsidian's own labels come from the app's\n` +
			`     shipped strings (npm run labels), not from a guess. -->\n\n` +
			`{{SELECTOR}}\n\n` +
			body,
	);
}

console.log(`added ${code} (${nativeName})\n`);
console.log(`  src/lang/translations.ts       ${stringKeys.length} empty strings to fill`);
console.log(`  docs/i18n/README.${code}.md${" ".repeat(Math.max(0, 12 - code.length))}English body to translate`);
console.log(`  docs/i18n/usage.${code}.md${" ".repeat(Math.max(0, 14 - code.length))}English body to translate\n`);
console.log("Then: npm run stamp && npm run check:lang && npm run check:docs");
console.log("Quote Obsidian's own UI labels from `npm run labels`, never from memory.");
