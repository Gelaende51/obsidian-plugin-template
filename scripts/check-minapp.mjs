#!/usr/bin/env node
/**
 * Reports the lowest minAppVersion the source actually supports.
 *
 * The submission review enforces this: `obsidianmd/no-unsupported-api` reads
 * the `@since` tag on each declaration in obsidian.d.ts and compares it with
 * manifest.json. Your floor is the *maximum* @since across everything you
 * touch, and it moves silently — one convenience call raises the minimum
 * Obsidian version for every user of the plugin.
 *
 * The point of running it locally is the direction of the feedback: this says
 * what a call costs at the moment you adopt it, instead of two releases later
 * when a review rejects the manifest.
 *
 * It works by asking that rule rather than reimplementing it. A first version
 * matched identifiers against the type definitions by hand and reported
 * `match`, `cls` and `name` as APIs — a floor of 1.13.1 for a plugin using
 * nothing newer than 1.4. Reimplementing a type-aware check without types
 * cannot be made accurate, and a confidently wrong number is worse than none.
 *
 * So: drop the declared floor to nothing, let the real rule report everything
 * it would flag, and take the maximum. The manifest is restored unconditionally
 * — leaving it at 0.0.1 would be a far worse failure than the one this exists
 * to prevent.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = `${root}manifest.json`;
const original = readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(original);

const cmp = (a, b) => {
	const [x, y] = [a.split(".").map(Number), b.split(".").map(Number)];
	for (let i = 0; i < Math.max(x.length, y.length); i++) {
		const d = (x[i] ?? 0) - (y[i] ?? 0);
		if (d) return d;
	}
	return 0;
};

let findings = [];
try {
	writeFileSync(manifestPath, JSON.stringify({ ...manifest, minAppVersion: "0.0.1" }, null, "\t") + "\n");
	let out = "";
	try {
		out = execFileSync("npx", ["eslint", "src", "--format", "json"], {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
	} catch (err) {
		// eslint exits non-zero when it reports anything, which is the normal
		// case here — the findings are on stdout regardless.
		out = err.stdout ?? "";
	}
	if (!out.trim()) {
		console.error("eslint produced no output — is it installed? Try npm install.");
		process.exit(2);
	}
	for (const file of JSON.parse(out)) {
		for (const m of file.messages) {
			if (m.ruleId !== "obsidianmd/no-unsupported-api") continue;
			const v = /requires Obsidian v?([0-9]+\.[0-9.]+)/.exec(m.message);
			const api = /'([^']+)'/.exec(m.message);
			if (v) findings.push({ version: v[1], api: api?.[1] ?? m.message, file: file.filePath, line: m.line });
		}
	}
} finally {
	writeFileSync(manifestPath, original);
}

const floor = findings.reduce((max, f) => (cmp(f.version, max) > 0 ? f.version : max), "0.0.0");

console.log(`manifest minAppVersion: ${manifest.minAppVersion}`);
console.log(`highest @since in use:  ${floor === "0.0.0" ? "(nothing above the floor)" : floor}\n`);

const seen = new Map();
for (const f of findings) if (!seen.has(f.api) || cmp(f.version, seen.get(f.api)) > 0) seen.set(f.api, f.version);
for (const [api, v] of [...seen].sort((a, b) => cmp(b[1], a[1]) || a[0].localeCompare(b[0]))) {
	console.log(`  ${v.padEnd(10)} ${api}`);
}
if (seen.size) console.log();

if (cmp(manifest.minAppVersion, floor) < 0) {
	console.log(`Raise minAppVersion to ${floor}, or stop using what needs it.`);
	console.log("Each step up excludes users who have not updated — check which call is buying it.");
	process.exit(1);
} else if (floor !== "0.0.0" && cmp(manifest.minAppVersion, floor) > 0) {
	console.log(`Nothing in src needs more than ${floor}.`);
	// Below roughly 1.0 the advice stops being real: those builds are years
	// old, the API surface has moved under them, and no one is running one.
	// Report the fact, but do not pretend a 0.x floor is reach worth taking.
	if (cmp(floor, "1.0.0") >= 0) {
		console.log(`minAppVersion could drop to ${floor} — lowering it is free reach.`);
	} else {
		console.log("That is old enough not to be worth claiming; the current floor is fine.");
	}
} else {
	console.log("minAppVersion is consistent with what the source requires.");
}
