#!/usr/bin/env node
/**
 * What stays manual after a release: taking the listing out of draft (once,
 * after the first release), and the listing fields manifest.json has no place
 * for. Everything else — tests, the preview scan, the release commit and tag,
 * the attested release, queueing the directory's scan, waiting for the
 * listing and recording the review — is done by the Release workflow
 * (`npm run release -- <version>`).
 *
 * Publishing makes the plugin visible to everyone and is not undoable the way
 * the rest is, so it is the owner's click on the site, never a script's.
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { notify } from "./notify.mjs";
import { TAGS } from "obsidian-toolkit/listing-tags";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(`${root}manifest.json`, "utf8"));

let repo = "<owner>/<repo>";
try {
	const url = execFileSync("git", ["remote", "get-url", "origin"], {
		cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
	});
	repo = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url)?.[1] ?? repo;
} catch { /* no remote yet */ }

// The listing carries fields the manifest has no room for, and the only way to
// set them is the form — the site authenticates with a session cookie and has
// no token, so this prints what to type rather than typing it. See
// docs/listing.md.
const listingPath = `${root}listing.json`;
const listing = existsSync(listingPath)
	? Object.fromEntries(
			Object.entries(JSON.parse(readFileSync(listingPath, "utf8"))).filter(([k]) => !k.startsWith("_")),
		)
	: {};

const admin = `https://community.obsidian.md/account/plugins/${manifest.id}`;
const listingUrl = `https://community.obsidian.md/plugins/${manifest.id}`;

/** What to type into the Edit listing form, in the form's own order. */
function describeListing() {
	const rows = [];
	if (listing.tags?.length)
		rows.push(`     Tags        ${listing.tags.map((t) => TAGS[t]?.label ?? t).join(", ")}`);
	if (listing.pricing && listing.pricing !== "free") rows.push(`     Pricing     ${listing.pricing}`);
	if (listing.payment_description) rows.push(`     Payment     ${listing.payment_description}`);
	if (listing.long_desc) rows.push(`     Long desc   ${listing.long_desc.split("\n")[0].slice(0, 60)}…`);
	if (listing.lucide_icon_name) rows.push(`     Icon        ${listing.lucide_icon_name} on ${listing.icon_color}`);
	if (!rows.length) return `     ${admin}/edit\n\n   Nothing set in listing.json — the site's defaults stand.\n`;
	return `     ${admin}/edit\n\n${rows.join("\n")}\n\n   The short description comes from manifest.json and is not edited here.\n`;
}

console.log(`
${manifest.name} ${manifest.version} — what is left on the site

1. The Release workflow queued the directory's scan and recorded its review
   in .github/directory-reviews/${manifest.version}.json (with the
   OBSIDIAN_COMMUNITY_COOKIE secret set; without it, \`npm run release\` opened
   the check-release page in your browser). Read the review:

     ${admin}

   Everything under Warnings should be something you decided to accept, and
   nothing under Errors. The workflow fails on a Warning the previous release
   did not have.

2. Only after the first release, and only once: on the same page,

     Publish

   This takes the entry out of draft and makes it visible to everyone. It is
   the one step you cannot quietly take back.

3. Confirm it is live and the scorecard is the one you read:

     ${listingUrl}

Listing metadata, if any of it has changed:

${describeListing()}
Provenance, if you have not checked it already:

     gh attestation verify main.js --repo ${repo} --signer-repo Gelaende51/obsidian-toolkit
`);

// Read the public listing back and say whether it still agrees with the source
// tree. Exit 2 from the checker means "valid file, stale site" — which is the
// normal state at this point, so it is reported rather than treated as failure.
if (existsSync(listingPath)) {
	const check = spawnSync(process.execPath, [`${root}node_modules/obsidian-toolkit/bin/check-listing.mjs`, "--remote"], {
		cwd: root,
		stdio: "inherit",
	});
	if (check.status === 1) process.exit(1);
}

notify(
	`${manifest.name} ${manifest.version}: the site's manual steps`,
	"See the terminal for what is left on community.obsidian.md.",
);
