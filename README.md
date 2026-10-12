# Obsidian plugin template

A starting point that already knows what a submission review will say.

Everything here was extracted from a plugin that went through the community-plugin
process — including the parts that failed it the first time. The tooling is not the
interesting bit; the interesting bit is that each script exists because something went
wrong without it.

> **This is the template's own README.** `npm run init` replaces it with
> `README.plugin.md`, which is the starting README for your plugin.

## Starting a plugin

```bash
gh repo create my-plugin --template Gelaende51/obsidian-plugin-template --private --clone
cd my-plugin
npm install
npm run init
```

`init` asks for the id, name and description, offers to remove any subsystem you do not
want, sets up git and the remote, and then **deletes itself** so the plugin does not ship
its own scaffolding. Nothing is written until every answer is in, so quitting halfway
leaves the template as it was.

## What you get

| | |
| --- | --- |
| **Build** | esbuild + TypeScript, no runtime dependencies, Node/Electron/CodeMirror externalised |
| **Review parity** | `npm run lint` runs `eslint-plugin-obsidianmd` — the submission review's own rule set — and `npm run build` depends on it |
| **`check:minapp`** | Tells you what your API usage actually requires, by asking the real rule rather than guessing |
| **Live-app tests** | A DevTools-protocol harness that drives a real Obsidian, plus a self-test that proves the harness before you trust it |
| **Localisation** | `t()`, a coverage gate, a locale scaffolder, and a reader for Obsidian's *own* UI strings |
| **Docs integrity** | Link/anchor checking with GitHub's real slug rules, and structural parity between translations |
| **Release** | Three tiers by reversibility: tag locally, preview-scan the tag, then publish. Signed provenance throughout |
| **Screenshots** | Live-app capture that refuses to shoot with test residue on screen, and never overwrites a good image with a rejected one |
| **Safety** | A commit hook that refuses an open debug port, a staged credential file, or a secret in the diff |
| **Dependencies** | Dependabot (bundled dependencies with majors, build tools, actions in groups); a dependency update that changes `main.js` is built as a `-deps` pre-release for BRAT once CI passes |
| **Toolkit** | Shared tooling as devDependencies: [development-template](https://github.com/Gelaende51/development-template) (test harness, error sentences, environment watch, failure issues per target) and [electron-template](https://github.com/Gelaende51/electron-template) (CDP session, suite runner, distro dependencies). Per-project facts in `devkit.config.json` |
| **Guides** | `docs/obsidian-platforms.md` here; [portability and CI](https://github.com/Gelaende51/development-template/blob/main/docs/portability-and-ci.md) in development-template |

## The parts worth reading before you delete them

**`.dev/test-harness.mjs`** — run this first. Obsidian reads a plugin's bundle once, at
enable time, and holds it, so a test suite run against an already-open window asserts
against the *previous* build. That produces green runs against code that does not exist.
The harness proves its own reload by writing a marker into the bundle and reading it
back, because "we call `disablePlugin`" is an assumption and this is evidence.

**`scripts/check-minapp.mjs`** — the submission review derives your minimum Obsidian
version from `@since` tags, so one convenience call can silently exclude everyone below
1.8. This reports the cost at the moment you adopt a call. It works by asking the real
lint rule; a first version reimplemented the check by hand and confidently reported a
floor four minor versions too high, which is worse than having no tool.

**`scripts/preflight.sh`** — refuses a commit while Obsidian's debugging port is open, or
with a credential file staged. Both are things that were previously handled by
remembering.

**`listing.json`** — the community site shows tags, a long description, a pricing model
and an icon that `manifest.json` has no field for, and they otherwise live only in a web
form. This keeps them in the source tree, refuses values the form would reject, and
diffs itself against the live listing. See [the listing](docs/listing.md).

**`docs/development.md`** — why the review disagrees with your local lint, and what to do
about it.

## Conventions it assumes

- **AGPL-3.0.** Change `LICENSE` and the `license` field if you want something else.
- **Documentation in English first**, translations alongside with a freshness stamp
  recording the commit they were made from.
- **User-facing strings never inline** — `t()` and a key, so a missing translation is a
  build failure rather than a surprise.
- **Comments explain why**, and specifically why not the obvious alternative. See
  [STYLE.md](STYLE.md).

## Layout

```
src/            main, settings, settings tab, entry points, lang, internal types
docs/           usage, development, compatibility, listing; i18n/ for translations
scripts/        checks, i18n tooling, release, publish, preflight, init
.dev/           live-app harness, screenshots, disclosure figures, takeaways
.github/        CI on every push; release on a version tag
.claude/        commit hook, and slash commands for the recurring workflows
```

## Licence

AGPL-3.0-only. See [LICENSE](LICENSE).
