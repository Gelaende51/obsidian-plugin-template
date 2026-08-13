#!/usr/bin/env node
/**
 * Proves the harness, not the plugin.
 *
 * Run this before writing any real test. Every assertion here is a thing that
 * has silently produced a green run against nothing:
 *
 *   - connecting to the wrong window when two vaults are open
 *   - probing for readiness in a way that throws instead of reporting "not yet"
 *   - testing the bundle Obsidian booted with rather than the one on disk
 *   - leaving fixtures in the user's vault
 *
 * The reload check is the important one. Obsidian reads a plugin's bundle once,
 * at enable time, and holds it — so a suite run against an already-open window
 * asserts against the previous build. It is proven here by writing a marker
 * into the built main.js, reloading, and reading it back, because "we call
 * disablePlugin then enablePlugin" is an assumption and this is evidence.
 *
 * Requires Obsidian running with --remote-debugging-port=9222 and a vault open.
 * With more than one vault open, name it: OBSIDIAN_VAULT="<name>"
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { connect, PAUSE, reloadPlugin } from "./cdpSession.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const PLUGIN_ID = JSON.parse(readFileSync(`${root}manifest.json`, "utf8")).id;
const FIXTURE = "HarnessCheck";

const results = [];
const expect = (label, actual, want) => {
	const ok = typeof want === "function" ? want(actual) : actual === want;
	results.push({ ok, label, actual });
	console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  → got ${JSON.stringify(actual)}`}`);
};

const page = await connect();

console.log("\nharness");

// A probe must not dereference what it is waiting for: on a cold start the page
// target answers while `app` is still undefined, and a probe that throws kills
// the run instead of reporting "not yet".
let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
	try {
		ready = await page.evaluate(
			`return typeof app !== "undefined" && !!app.plugins?.plugins?.[${JSON.stringify(PLUGIN_ID)}] && app.workspace?.layoutReady === true;`,
		);
	} catch {
		ready = false;
	}
	if (!ready) await new Promise((r) => setTimeout(r, 500));
}
expect("app, layout and plugin are up", ready, true);

const vault = await page.evaluate(`return app.vault.getName();`);
expect("connected to a named vault", typeof vault === "string" && vault.length > 0, true);
console.log(`        (${vault})`);

// The evidence, not the assumption: mark the bundle on disk, reload, read it
// back from the running plugin. If Obsidian is holding the old bundle this
// fails, which is exactly the failure that is otherwise invisible.
const mainPath = `${root}main.js`;
let restored = false;
try {
	const original = readFileSync(mainPath, "utf8");
	const marker = `harness-${Date.now()}`;
	writeFileSync(mainPath, `${original}\nwindow.__harnessMarker = ${JSON.stringify(marker)};\n`);
	await reloadPlugin(page, PLUGIN_ID);
	const seen = await page.evaluate(`return window.__harnessMarker ?? null;`);
	expect("reloadPlugin swaps in the build on disk", seen, marker);
	writeFileSync(mainPath, original);
	restored = true;
	await reloadPlugin(page, PLUGIN_ID);
	expect("and the real build is back", await page.evaluate(`return !!app.plugins.plugins[${JSON.stringify(PLUGIN_ID)}];`), true);
} catch (err) {
	expect("reloadPlugin marker check", err.message, "no error");
	if (!restored) console.error("  main.js may be modified — run npm run build");
}

// Fixtures are visible: anything a suite creates in the user's data must come
// back out whether the run passed or failed.
try {
	await page.evaluate(`
		if (!app.vault.getAbstractFileByPath(${JSON.stringify(FIXTURE)})) {
			await app.vault.createFolder(${JSON.stringify(FIXTURE)});
		}
		${PAUSE(150)}
		return true;
	`);
	expect("fixture created", await page.evaluate(`return !!app.vault.getAbstractFileByPath(${JSON.stringify(FIXTURE)});`), true);
} finally {
	await page.evaluate(`
		const f = app.vault.getAbstractFileByPath(${JSON.stringify(FIXTURE)});
		// Straight to delete, not trash: the trash is inside the vault too.
		if (f) await app.vault.delete(f, true);
		return true;
	`);
}
expect("fixture removed", await page.evaluate(`return !app.vault.getAbstractFileByPath(${JSON.stringify(FIXTURE)});`), true);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} assertions passed`);
if (passed === results.length) console.log("\nThe harness is sound. Write real tests against it.");
page.close();
process.exit(passed === results.length ? 0 : 1);
