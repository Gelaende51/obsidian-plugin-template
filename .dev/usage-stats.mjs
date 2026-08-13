#!/usr/bin/env node
/**
 * Computes the AI-disclosure figures for the README from real transcripts.
 *
 * The rule this serves: if a number appears in the README, something must be
 * able to recompute it. A remembered token count is a guess presented as a
 * measurement.
 *
 *   node .dev/usage-stats.mjs           rewrite the line
 *   node .dev/usage-stats.mjs --check   exit 1 if it is out of date
 *
 * Transcripts live outside the repository, so nobody without that history can
 * honestly restate the numbers — which is exactly why a fork must replace the
 * disclosure with its own rather than inherit this one.
 *
 * Two things this cannot be. It cannot be exact: writing the line is itself
 * part of a session, so the committed figure always trails by the turns that
 * committed it, which is why every number carries a "~". And it does not
 * belong in `npm run build`, where it would fail for every contributor who has
 * no transcripts. Run it as the last step before tagging.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const projects = join(homedir(), ".claude", "projects");

/** Transcript directories are named after the project path, slug-encoded. */
const slug = root.replace(/\/$/, "").replace(/[^A-Za-z0-9]/g, "-");
const dir = existsSync(projects)
	? readdirSync(projects).find((d) => d === slug || d.endsWith(slug))
	: null;

if (!dir) {
	console.error("No transcripts found for this project — leaving the disclosure alone.");
	console.error("This is expected on any machine but the one the work was done on.");
	process.exit(process.argv.includes("--check") ? 0 : 1);
}

const totals = { output: 0, input: 0, cacheRead: 0, cacheWrite: 0 };
let responses = 0;
let first = null;
let last = null;
const files = readdirSync(join(projects, dir)).filter((f) => f.endsWith(".jsonl"));

for (const file of files) {
	for (const line of readFileSync(join(projects, dir, file), "utf8").split("\n")) {
		if (!line.trim()) continue;
		let row;
		try { row = JSON.parse(line); } catch { continue; }
		const u = row?.message?.usage;
		if (!u) continue;
		responses++;
		totals.output += u.output_tokens ?? 0;
		totals.input += u.input_tokens ?? 0;
		totals.cacheRead += u.cache_read_input_tokens ?? 0;
		totals.cacheWrite += u.cache_creation_input_tokens ?? 0;
		const at = row.timestamp ? new Date(row.timestamp) : null;
		if (at && !isNaN(at)) {
			if (!first || at < first) first = at;
			if (!last || at > last) last = at;
		}
	}
}

const millions = (n) => `${(n / 1e6).toFixed(1)} M`;
const day = (d) => d.getDate();
const month = (d) => d.toLocaleString("en-GB", { month: "short" });
const range = (a, b) =>
	a.getMonth() === b.getMonth()
		? `${day(a)}–${day(b)} ${month(b)} ${b.getFullYear()}`
		: `${day(a)} ${month(a)} – ${day(b)} ${month(b)} ${b.getFullYear()}`;

const sent = totals.input + totals.cacheWrite;
const all = totals.output + sent + totals.cacheRead;

// Escaped tildes, not bare ones. Markdown — GitHub's and the community site's
// alike — reads a *single* tilde as a strikethrough delimiter, so several
// approximation signs on one line pair up and strike the text between the
// first and the last. `\~` renders as `~` and cannot pair.
const line =
	`- **Usage** — ${range(first, last)}, ${files.length} sessions, ` +
	`\\~${responses.toLocaleString("en-US")} responses: \\~${millions(totals.output)} tokens generated, ` +
	`\\~${millions(sent)} sent, \\~${millions(totals.cacheRead)} cached re-reads (\\~${millions(all)} total).`;

const readmePath = join(root, "README.md");
const text = readFileSync(readmePath, "utf8");
const pattern = /^- \*\*Usage\*\* — .*$/m;

if (!pattern.test(text)) {
	console.error("No `- **Usage** —` line in README.md to update.");
	process.exit(1);
}

if (process.argv.includes("--check")) {
	const current = pattern.exec(text)[0];
	if (current === line) { console.log("usage line is current"); process.exit(0); }
	console.log("usage line is stale");
	console.log(`  is:     ${current}`);
	console.log(`  should: ${line}`);
	process.exit(1);
}

writeFileSync(readmePath, text.replace(pattern, line));
console.log(line);
