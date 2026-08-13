#!/usr/bin/env node
/**
 * Every translation has the same structure as its English source.
 *
 * Translations drift structurally in ways nobody reads closely enough to
 * notice: a table row lost, a heading demoted, a keyboard legend translated
 * when it should not have been. Comparing a fingerprint catches all of that
 * without needing to know the language.
 *
 * It deliberately does not compare *content* — that is what the freshness
 * stamp in each file's header is for.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const i18n = `${root}docs/i18n`;

/**
 * Counts of things a translation must preserve. Code fences are stripped
 * first: their contents are not translated, so counting inside them would
 * measure the same text twice.
 */
function shape(text) {
	const body = text.replace(/```[\s\S]*?```/g, "");
	return {
		h2: (body.match(/^## /gm) ?? []).length,
		h3: (body.match(/^### /gm) ?? []).length,
		tableRows: (body.match(/^\|/gm) ?? []).length,
		kbd: (body.match(/<kbd>/g) ?? []).length,
		bullets: (body.match(/^- /gm) ?? []).length,
		fences: (text.match(/^```/gm) ?? []).length / 2,
	};
}

const SOURCES = { README: `${root}README.md`, usage: `${root}docs/usage.md` };

if (!existsSync(i18n) || !readdirSync(i18n).some((f) => f.endsWith(".md"))) {
	console.log("no translations present");
	process.exit(0);
}

let mismatched = 0;
let checked = 0;
for (const file of readdirSync(i18n).filter((f) => f.endsWith(".md")).sort()) {
	const m = /^(README|usage)\.(.+)\.md$/.exec(file);
	if (!m) {
		console.log(`unrecognised name   docs/i18n/${file}`);
		mismatched++;
		continue;
	}
	const source = SOURCES[m[1]];
	if (!existsSync(source)) continue;
	checked++;
	const want = shape(readFileSync(source, "utf8"));
	const got = shape(readFileSync(`${i18n}/${file}`, "utf8"));
	const diffs = Object.keys(want).filter((k) => want[k] !== got[k]);
	if (diffs.length) {
		mismatched++;
		console.log(`docs/i18n/${file}`);
		for (const k of diffs) console.log(`    ${k.padEnd(10)} expected ${want[k]}, found ${got[k]}`);
	}
}

console.log(`${checked} translations checked, ${mismatched} differ structurally`);
process.exit(mismatched ? 1 : 0);
