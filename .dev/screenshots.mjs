#!/usr/bin/env node
/**
 * Captures the screenshots the README links, from a live Obsidian.
 *
 *   node .dev/screenshots.mjs            every scene
 *   node .dev/screenshots.mjs hero       one scene
 *
 * Define scenes in SCENES below: which vault, which note, what to do before
 * the shot, and where to crop. Everything else here is the machinery, and
 * most of it exists because of a specific way a screenshot lied.
 *
 * Requires Obsidian with --remote-debugging-port=9222 and the vault open.
 *
 * Four traps this guards against, all of them found the hard way:
 *
 *   1. A rejected shot overwrites the good one. Writing the PNG and *then*
 *      checking it means a failed run replaces a good committed image with
 *      the bad one it just refused — the script exits non-zero, the file is
 *      already changed, and `git add -A` ships it. Here the check happens on
 *      a temporary file and the real path is only written on success.
 *
 *   2. A CDP-driven window paints no frames. requestAnimationFrame never
 *      fires and CSS transitions never advance, so a popover faded in with a
 *      transition is captured half-transparent. Transitions are disabled
 *      before the shot rather than waited on.
 *
 *   3. The language is not what localStorage says. Obsidian reads it once at
 *      startup, so writing to localStorage changes nothing until a reload —
 *      and a guard that reads it back only proves its own write landed.
 *      i18next's resource store carries the truth.
 *
 *   4. Test residue is invisible in a passing test run and perfectly visible
 *      in a photograph. The capture refuses while a fixture folder exists or
 *      an unexpected plugin is enabled.
 */
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { connect, PAUSE, reloadPlugin } from "./cdpSession.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(`${root}manifest.json`, "utf8"));
const OUT = `${root}docs/images`;

/**
 * `before` runs in the page and should leave the UI in the state you want.
 * `clip` is the crop in CSS pixels; omit it for the whole window.
 */
const SCENES = {
	hero: {
		// The name of the vault in .personal/, which is what the harness matches
		// the window title against. Keep it distinctive: two windows both called
		// "vault" are two windows the harness will refuse to choose between.
		vault: "Demo",
		note: "Welcome.md",
		before: `
			// TODO: put the UI into the state worth photographing.
			${PAUSE(200)}
		`,
		clip: { x: 0, y: 0, width: 1200, height: 400 },
	},
};

/** Fixture folders a suite might have left behind; the shot refuses while one exists. */
const FIXTURES = ["HarnessCheck"];

const name = process.argv[2];
const scenes = name ? { [name]: SCENES[name] } : SCENES;
if (name && !SCENES[name]) {
	console.error(`unknown scene "${name}" — have: ${Object.keys(SCENES).join(", ")}`);
	process.exit(2);
}

const page = await connect();

// Wait for the app, guarding from the root: a page target answers while `app`
// is still undefined, and a probe that dereferences it kills the run.
for (let i = 0; i < 60; i++) {
	let ready = false;
	try {
		ready = await page.evaluate(`return typeof app !== "undefined" && app.workspace?.layoutReady === true;`);
	} catch { ready = false; }
	if (ready) break;
	await new Promise((r) => setTimeout(r, 500));
}

// Test the build on disk, not the one Obsidian booted with.
await reloadPlugin(page, manifest.id);

const residue = await page.evaluate(`
	return {
		fixture: ${JSON.stringify(FIXTURES)}.find((p) => app.vault.getAbstractFileByPath(p)) ?? null,
		others: [...app.plugins.enabledPlugins].filter((id) => id !== ${JSON.stringify(manifest.id)}),
		// Not localStorage — this proves nothing about what is drawn. Obsidian
		// loads English plus the active language and nothing else, so a second
		// key here is chrome still in the previous language.
		loaded: Object.keys(i18next?.services?.resourceStore?.data ?? { en: 1 }),
	};
`);

if (residue.fixture) {
	console.error(`The vault still holds the "${residue.fixture}" fixture.`);
	console.error("Run the suite to completion, or delete the folder, before capturing.");
	process.exit(1);
}
if (residue.others.length) {
	console.error(`Other plugins are enabled and will draw into the shot: ${residue.others.join(", ")}`);
	console.error("Disable them, or accept that the screenshot shows them.");
	process.exit(1);
}
if (residue.loaded.length > 1) {
	console.error(`Two languages are loaded (${residue.loaded.join(", ")}) — some chrome is still in the old one.`);
	console.error("Restart Obsidian after changing language; it is read once at startup.");
	process.exit(1);
}

mkdirSync(OUT, { recursive: true });
let failed = 0;

for (const [key, scene] of Object.entries(scenes)) {
	process.stdout.write(`  ${key.padEnd(20)}`);

	await page.evaluate(`
		const file = app.vault.getAbstractFileByPath(${JSON.stringify(scene.note)});
		if (file) await app.workspace.getLeaf(false).openFile(file);
		${PAUSE(400)}
		// Transitions cannot advance in a window that paints no frames, so a
		// faded-in element is captured mid-fade. Disable them outright.
		let style = document.getElementById("screenshot-no-transitions");
		if (!style) {
			style = document.createElement("style");
			style.id = "screenshot-no-transitions";
			style.textContent = "*, *::before, *::after { transition: none !important; animation: none !important; }";
			document.head.appendChild(style);
		}
		${scene.before ?? ""}
		return true;
	`);

	const shot = await page.send("Page.captureScreenshot", {
		format: "png",
		...(scene.clip ? { clip: { ...scene.clip, scale: 2 } } : {}),
	});

	// Written to a temporary path first. The committed image is only replaced
	// once this one has been accepted.
	const tmp = `${OUT}/.${key}.tmp.png`;
	const final = `${OUT}/${key}.png`;
	writeFileSync(tmp, Buffer.from(shot.data, "base64"));

	const bytes = Buffer.from(shot.data, "base64").length;
	if (bytes < 5000) {
		console.log(`REJECTED (${bytes} bytes — the window is probably blank)`);
		if (existsSync(final)) console.log(`${" ".repeat(22)}kept the previous ${key}.png`);
		unlinkSync(tmp);
		failed++;
		continue;
	}

	writeFileSync(final, readFileSync(tmp));
	unlinkSync(tmp);
	console.log(`ok (${(bytes / 1024).toFixed(0)} KB)`);
}

await page.evaluate(`
	document.getElementById("screenshot-no-transitions")?.remove();
	return true;
`);

page.close();
if (failed) {
	console.log(`\n${failed} scene(s) rejected. Previous images are untouched.`);
	process.exit(1);
}
console.log("\nCheck the images before committing — this script can only reject the obvious failures.");
