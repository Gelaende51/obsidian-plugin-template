#!/usr/bin/env node
/**
 * The half of a release that cannot be automated safely.
 *
 * The community site authenticates with an email and password — there is no
 * token path — so these steps need a browser someone is already signed into.
 * They are deliberately not part of `npm run release`: a release command that
 * silently does less on a machine without a session is worse than one that
 * never tried.
 *
 * So this prints the steps, in the order that puts the check *before* the
 * publication rather than after it.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(`${root}manifest.json`, "utf8"));

let repo = "<owner>/<repo>";
try {
	const url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
	repo = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url)?.[1] ?? repo;
} catch {
	// No remote yet; the placeholder is fine.
}

const admin = `https://community.obsidian.md/account/plugins/${manifest.id}`;

console.log(`
${manifest.name} ${manifest.version}

1. Wait for the release workflow to finish, then confirm provenance:

     gh run watch --exit-status
     gh release download ${manifest.version} --repo ${repo} --dir /tmp/verify
     gh attestation verify /tmp/verify/main.js --repo ${repo}

2. Preview scan BEFORE anyone can install it — ${admin}

     Review branch -> enter the tag "${manifest.version}" -> Run preview scan

   This runs the submission review against the tag without publishing, which
   turns the review from a verdict into a pre-flight check. Read the result.
   Warnings you have accepted deliberately should be the only ones there.

3. Only then promote it:

     ⋯ -> Check for new releases

   It answers "your manifest points at version X, a scan has been queued".
   Do not assume this happens by itself — it sometimes does, and it has also
   sat for over an hour with the site counting the release and still reporting
   the previous version as current.

4. Read the public scorecard once the scan completes:

     https://community.obsidian.md/plugins/${manifest.id}

   It is scored without your devDependencies, so it will not agree with a local
   \`npm run lint\` by construction. See docs/development.md.
`);
