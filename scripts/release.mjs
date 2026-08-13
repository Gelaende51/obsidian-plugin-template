#!/usr/bin/env node
/**
 * Cuts a release, up to and including the tag. CI does the rest.
 *
 *   npm run release -- 1.1.0
 *
 * Deliberately stops at the tag. Everything here is deterministic and works on
 * any machine; the steps that need a signed-in browser live in
 * `release:review`, which is a separate command for that reason. A release
 * tool that behaves differently depending on where it runs is the worst kind.
 *
 * Order matters. The gates run before anything is written, so a refusal leaves
 * the tree exactly as it was rather than half-bumped.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const run = (cmd, args, opts = {}) =>
	execFileSync(cmd, args, { cwd: root, encoding: "utf8", stdio: "pipe", ...opts }).trim();

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
	console.error("Usage: npm run release -- <version>    e.g. 1.1.0");
	process.exit(2);
}

const step = (label) => process.stdout.write(`  ${label.padEnd(42)}`);
const ok = () => console.log("ok");
const die = (msg) => {
	console.log("REFUSED");
	console.error(`\n${msg}\n`);
	process.exit(1);
};

console.log(`\nReleasing ${version}\n`);

step("working tree clean");
if (run("git", ["status", "--porcelain"])) die("Commit or stash your changes first.");
ok();

step("on the default branch");
const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
if (branch !== "main" && branch !== "master") die(`On ${branch}. Releases are cut from the default branch.`);
ok();

step("tag does not already exist");
const tags = run("git", ["tag", "-l"]).split("\n");
if (tags.includes(version)) die(`Tag ${version} already exists.`);
ok();

step("preflight (debug port, secrets)");
try {
	run("bash", ["scripts/preflight.sh"], { stdio: "pipe" });
} catch (err) {
	die(err.stdout || err.stderr || "preflight refused");
}
ok();

step("build (tsc, lint, translations)");
try {
	run("npm", ["run", "build"]);
} catch (err) {
	die((err.stdout || "") + (err.stderr || ""));
}
ok();

step("documentation links and structure");
try {
	run("npm", ["run", "check:docs"]);
} catch (err) {
	die(err.stdout || err.stderr || "check:docs failed");
}
ok();

// A warning, not a gate: raising the floor is a judgement call about your
// users, and this is not the moment to be forced into it. But it must be said
// out loud before a tag exists, because after the tag it is a new release.
step("minAppVersion consistent");
let minappNote = "";
try {
	run("npm", ["run", "check:minapp"]);
	ok();
} catch (err) {
	console.log("WARNING");
	minappNote = (err.stdout || "").split("\n").filter(Boolean).slice(-2).join("\n");
}

const manifestPath = `${root}manifest.json`;
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const previous = manifest.version;

step(`manifest ${previous} -> ${version}`);
manifest.version = version;
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t") + "\n");
const pkgPath = `${root}package.json`;
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, "\t") + "\n");
ok();

// Append-only: this map is how an app too old for the current release finds
// the newest one it can still run. Deleting a line strands those users.
step(`versions.json += ${version}`);
const versionsPath = `${root}versions.json`;
const versions = JSON.parse(readFileSync(versionsPath, "utf8"));
versions[version] = manifest.minAppVersion;
writeFileSync(versionsPath, JSON.stringify(versions, null, "\t") + "\n");
ok();

step("commit and tag");
run("git", ["add", "manifest.json", "package.json", "versions.json"]);
run("git", ["commit", "-m", `Release ${version}`]);
run("git", ["tag", "-a", version, "-m", `${manifest.name} ${version}`]);
ok();

console.log(`\nTagged ${version} locally. Nothing has been pushed.\n`);
if (minappNote) console.log(`  note: ${minappNote.replace(/\n/g, "\n        ")}\n`);
console.log("  git push && git push origin " + version);
console.log("\nThen, before it is public:");
console.log("  npm run release:review    preview scan, then promote it");
