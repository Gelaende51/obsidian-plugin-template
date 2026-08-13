#!/usr/bin/env node
/**
 * Fills the {{SELECTOR}} placeholder in every document with the language
 * selector for that document and language.
 *
 * The selector names every locale that exists, so writing it by hand into each
 * file is both tedious and a guarantee that some of them drift. Documents are
 * written with the placeholder; this stamps them, and re-stamps every file
 * whenever a language is added or removed.
 *
 * With no translations present the line is removed entirely rather than left
 * as a selector offering one language — which is the state a fresh template is
 * in, and it should look finished rather than pending.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { selector } from "./i18n-selector.mjs";

// fileURLToPath, not .pathname: a repository can live in a directory whose
// name has a space in it, and .pathname hands back the percent-encoded form.
const root = fileURLToPath(new URL("..", import.meta.url));
const i18n = root + "docs/i18n/";

/** Locales with at least one translated document. */
const available = existsSync(i18n)
	? [...new Set(
			readdirSync(i18n)
				.map((f) => /^(?:README|usage)\.(.+)\.md$/.exec(f)?.[1])
				.filter(Boolean),
		)]
	: [];

// Either the placeholder or an already-stamped line, so a language added later
// updates every file rather than only the fresh ones.
const PATTERN =
	/^(?:\{\{SELECTOR\}\}|\*\*[^*\n]+\*\* (?:\[[^\]]*\]\([^)]*\)|\*\*[^*\n]+\*\*)(?: · (?:\[[^\]]*\]\([^)]*\)|\*\*[^*\n]+\*\*))*)\n\n/m;

const targets = [
	["README.md", "README", "en"],
	["docs/usage.md", "usage", "en"],
	...(existsSync(i18n)
		? readdirSync(i18n)
				.filter((f) => f.endsWith(".md"))
				.map((f) => {
					const m = /^(README|usage)\.(.+)\.md$/.exec(f);
					return m ? [`docs/i18n/${f}`, m[1], m[2]] : null;
				})
				.filter(Boolean)
		: []),
];

let stamped = 0;
let cleared = 0;
for (const [file, doc, lang] of targets) {
	const path = root + file;
	if (!existsSync(path)) continue;
	const text = readFileSync(path, "utf8");
	const line = available.length ? `${selector(doc, lang, available)}\n\n` : "{{SELECTOR}}\n\n";
	let next;
	if (PATTERN.test(text)) {
		next = text.replace(PATTERN, () => line);
	} else {
		// Never insert into a document that has not opted in. `newlocale` adds
		// the placeholder to the English sources when localisation begins;
		// doing it here would put a language line on any markdown file that
		// happened to be in the target list — including a template's own
		// README, which is not a translated document.
		console.log(`  (no selector line in ${file} — skipped)`);
		continue;
	}
	if (next !== text) writeFileSync(path, next);
	available.length ? stamped++ : cleared++;
}

if (available.length) console.log(`stamped ${stamped} documents across ${available.length + 1} languages`);
else console.log(`no translations present — ${cleared} documents reset to {{SELECTOR}}`);
