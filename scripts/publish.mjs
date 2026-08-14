#!/usr/bin/env node
/**
 * The last step: making the listing public, and telling the site to scan the
 * release you just cut.
 *
 * Separate from `release` and from `release:review` on purpose — these three
 * are different tiers of reversibility:
 *
 *   release          local and deterministic. Undo with `git tag -d`.
 *   release:review   read-only against the community site. Undo: nothing to undo.
 *   publish          makes the plugin visible to everyone. Not undoable in the
 *                    way the other two are.
 *
 * All of the browser steps need a signed-in session on community.obsidian.md,
 * which authenticates with an email and password — there is no token path, so
 * none of this can run in CI. See docs/development.md for what that needs.
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { notify } from "./notify.mjs";
import { TAGS } from "./obsidian-listing-tags.mjs";

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
${manifest.name} ${manifest.version} — publishing

Do not run this until \`npm run release:review\` came back clean. The preview
scan is the only check that happens while a mistake is still cheap.

1. ${admin}

     ⋯ -> Check for new releases

   It answers "your manifest points at version ${manifest.version}, a scan has
   been queued". Do not assume this happens by itself: it sometimes does, and
   it has also sat for over an hour with the site counting the release and
   still reporting the previous version as current.

2. Wait for that scan to finish, then read it. Everything under Warnings should
   be something you decided to accept, and nothing under Errors.

3. Only then, on the same page:

     Publish

   This takes the entry out of draft and makes it visible to everyone. It is
   the one step here you cannot quietly take back.

4. Confirm it is live and the scorecard is the one you read:

     ${listingUrl}

Listing metadata, if any of it has changed:

${describeListing()}
Provenance, if you have not checked it already:

     gh attestation verify main.js --repo ${repo}
`);

// Read the public listing back and say whether it still agrees with the source
// tree. Exit 2 from the checker means "valid file, stale site" — which is the
// normal state at this point, so it is reported rather than treated as failure.
if (existsSync(listingPath)) {
	const check = spawnSync(process.execPath, [`${root}scripts/check-listing.mjs`, "--remote"], {
		stdio: "inherit",
	});
	if (check.status === 1) process.exit(1);
}

notify(
	`${manifest.name} ${manifest.version} ready to publish`,
	"Browser steps needed on community.obsidian.md — see the terminal.",
);
