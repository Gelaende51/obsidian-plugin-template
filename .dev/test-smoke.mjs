#!/usr/bin/env node
/**
 * The first live-app suite: the plugin loads, and a reload brings back the
 * bundle on disk. Copy it for your own suites — `reset` puts back what a case
 * changed, `teardown` removes the fixtures; the cases then pass alone and in
 * any order (`node .dev/test-smoke.mjs --shuffle`).
 *
 *   node .dev/test-smoke.mjs              # against this machine's Obsidian (port 9222, a test vault)
 *   .dev/ci-run.sh test-smoke             # against a sandboxed one, as CI does
 */
import { readFileSync } from "node:fs";
import { connect, reloadPlugin } from "./cdpSession.mjs";
import { createSuite } from "development-template/harness";

const ID = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8")).id;
const page = await connect();
const { test, expect, run } = createSuite({
	// Nothing open in front of the workspace: a modal holds the keys.
	reset: () => page.evaluate(`document.querySelectorAll(".modal-close-button").forEach((b) => b.click()); return true;`),
	teardown: () => page.close(),
});

const state = () => page.evaluate(`
	const p = app.plugins.plugins[${JSON.stringify(ID)}];
	return JSON.stringify({ loaded: !!p?._loaded, enabled: app.plugins.enabledPlugins.has(${JSON.stringify(ID)}) });
`).then(JSON.parse);

test("the plugin is loaded and enabled", async () => {
	const s = await state();
	expect("loaded", s.loaded, true);
	expect("enabled", s.enabled, true);
});

test("a reload brings it back from the bundle on disk", async () => {
	await reloadPlugin(page, ID);
	const s = await state();
	expect("loaded again", s.loaded, true);
});

await run();
