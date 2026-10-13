# Development

[← back to README](../README.md)

## Setup

```bash
npm install
npm run dev            # esbuild watch
npm run build          # tsc --noEmit + lint + check:lang + production bundle
npm run lint           # the community-plugin review's own rule set
npm run check:minapp   # what your API usage actually requires
npm run check:docs     # documentation links and translation structure
```

The test vault lives in **`.personal/`** — inside the repository so it sits next to the
plugin it is for, and excluded from git so nothing about your machine reaches a commit.
`.personal/` also holds `personal.md`, which `npm run init` reads for account names so
none of them are baked into the template. See
[`.personal/README.md`](../.personal/README.md).

Give the vault a distinctive directory name and keep it. Obsidian names a vault after
its directory, and the harness picks its window by that name — so calling every plugin's
test vault `vault` means it cannot tell two open windows apart, and refuses rather than
guessing. Put the name in `OBSIDIAN_VAULT` and in the screenshot scenes.

To test in a real vault, symlink or copy `main.js`, `manifest.json` and `styles.css`
into `<vault>/.obsidian/plugins/<id>/`. Symlinks plus `npm run dev` give a live-reload
loop — though Obsidian still needs the plugin toggled off and on to pick up a new build,
which is a fact with consequences (see [Testing](#testing)).

## Dependencies

None at runtime. `dependencies` is empty, and the bundle's only `require()` calls are for
modules the host already has. `devDependencies` are build and review tooling only.

Deliberately **not** including `@types/node`. If the plugin reaches into Node, declare
the surface you use in `src/types/` instead — see
[the review's environment](#the-reviews-environment-is-not-yours).

## Ground rules

- Add a new key to `src/lang/strings.ts` first, then to every locale — `check:lang` will
  tell you which are missing.
- No user-facing string may be hardcoded; everything goes through `t()`.
- Prefer Obsidian's documented API. Undocumented internals are typed in
  `src/types/obsidian-internal.d.ts` and **guarded at the call site**.
- Whatever a component adds to the DOM, it removes on unload — and the removal goes in
  the same commit as the addition.
- Every Obsidian API call costs a `minAppVersion`. Check what it costs before reaching
  for it: `npm run check:minapp`.
- Never translate a plugin's name, yours or anyone else's.
- Follow Obsidian's [Developer policies](https://docs.obsidian.md/Developer+policies) and
  [submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins).

## Testing

There are no unit tests, on purpose. The bugs in a plugin live in the seams between your
code and the host, and a mock is a statement of what you believe the host does. The
suites drive a **live** Obsidian over the DevTools protocol and assert what the user
would see: what the DOM says, and what is on disk afterwards.

```bash
node .dev/test-harness.mjs      # prove the harness itself
node .dev/screenshots.mjs       # capture the images the README links
```

Needs Obsidian running with `--remote-debugging-port=9222` (add it to
`~/.config/obsidian/user-flags.conf`) and a vault open. With several vaults open, choose
the window with `OBSIDIAN_VAULT=<name>`. **Comment the port back out when you are
done** — `scripts/preflight.sh` refuses a commit while it is open, but the port is a
debugging setting and every minute it is open is a minute anything on the machine can
drive your vault.

Run `test-harness.mjs` before writing any real test. It asserts the things that have
silently produced green runs against nothing — including the one that matters most:

> **A plugin's bundle is read once, at enable time, and held.** Rebuild `main.js` and
> the running app still has the old one. A suite run against an already-open window
> asserts against the previous build. `reloadPlugin()` at the start of every run is what
> makes a result mean anything, and the harness proves it works by writing a marker into
> the bundle, reloading, and reading it back.

Three more rules that cost real time to learn:

- **Make every new test fail on purpose once**, against deliberately broken code. A test
  that has never failed is a guess. One regression test here passed against code with
  the feature removed, because it was asserting on something else entirely.
- **Pin the settings a test depends on** and restore them unconditionally at the end of
  the run — a test that throws never reaches its own cleanup.
- **A readiness probe must not dereference what it is waiting for.** The page target
  answers while `app` is still undefined; guard from the root and treat a throwing probe
  as *not ready* rather than as a failure.

### Screenshots

`.dev/screenshots.mjs` drives the same live app and writes to `docs/images/`. Scenes are
declared at the top of the file: which note to open, what to do before the shot, where to
crop.

It refuses to shoot while a test fixture is in the vault or another plugin is enabled —
both are invisible in a passing test run and perfectly visible in a photograph. It also
disables CSS transitions first, because a window driven over the DevTools protocol paints
no frames, so anything faded in with a transition is captured mid-fade.

A rejected shot never overwrites the committed one. That is not a nicety: writing the PNG
and then checking it means a failed run replaces a good image with the bad one it just
refused, the script exits non-zero, and `git add -A` ships it.

## Passing the plugin review

Submitting to the community list runs an automated review, and the same rules run here:

```bash
npm run lint     # eslint-plugin-obsidianmd — the review's own rule set
```

`npm run build` depends on it, so a release cannot be cut with a finding the review
would raise.

### The review's environment is not yours

It lints with type information but **without your devDependencies**. Where a type package
is not resolvable there, every value from that library degrades to `any`, and each *use*
trips a separate type-aware rule.

Measured on the project this template came from: **141 of 164 warnings** on the public
scorecard were this, all from `fs`/`path`/`os` imports in fully-typed files. None
reproduced locally, and the inflation is indistinguishable from real findings unless you
reproduce the environment.

The fix is to declare the foreign surface in your own repository rather than depend on
`@types/*`. Narrower than upstream is a feature — declaring only the overloads you use
makes a wider call a compile error — and for a plugin whose reviewers care about
filesystem access, one file listing every syscall it can make beats a paragraph of
reassurance.

### `minAppVersion` is not free

The rule reads `@since` tags in `obsidian.d.ts`; your floor is the **maximum** across
everything you touch, and it moves silently. `npm run check:minapp` asks that rule
directly rather than reimplementing it, and tells you which call is buying the floor.

## Cutting a release

```bash
npm run release -- 1.1.0     # checks here, then the Release workflow does the rest
```

Before it, on your machine: the entries under `## Unreleased` in `CHANGELOG.md`, and
in every translated changelog (`docs/i18n/CHANGELOG.<lang>.md`) a pending section with
them translated — the release stops when one is missing. Commit and push.

`npm run release` (obsidian-toolkit's `obsidian-release-dispatch`) checks exactly that,
that the released files are committed and that your `main` is GitHub's, then starts
`.github/workflows/release.yml` and follows it:

| Step | Where | What it does |
| --- | --- | --- |
| Tests | Test workflow | The live-app suites on the oldest and newest Obsidian (Linux; Windows and macOS on request) |
| Preview scan | the directory's *Review branch* | Scans the commit about to be released; fails on a Warning the last release did not have — before anything is written |
| Release commit | `obsidian-release` | `## Unreleased` and every translation's pending section become `## 1.1.0 — <date>`, with a compare link; `manifest.json`, `package.json`, `versions.json` take the version |
| Tag and release | GitHub | Build, the tag/manifest check, a signed provenance attestation on each asset, the release |
| The directory | community.obsidian.md | Queues the release scan, waits for the public listing, reads the release's review, compares it with the previous one and records it in `.github/directory-reviews/` |

A tag pushed by hand (`git tag 1.1.0 && git push origin 1.1.0`) is released as it is,
without the changelog step. The first release may be the manifest's own `0.1.0`.

`versions.json` is append-only. It is how an app too old for the current release finds
the newest one it can still run; deleting a line strands those users.

### The directory's session

`community.obsidian.md` has no API and no token: it authenticates by session cookie.
The workflow's directory steps sign in with one stored as the repository secret
`OBSIDIAN_COMMUNITY_COOKIE`, and `npx obsidian-directory-session` keeps it alive — a
Chrome profile of its own, a silent renewal while that profile is signed in to
obsidian.md, and a window on the login page when you need to sign in again
(`--install` runs it daily). **Sign in yourself**: an agent should not type a password
into a form, even one you handed it. A wrapper of your own may hand the account over
(see the script's header), never through the environment of other programs.

Without the secret, the release still happens; `npm run release` then opens the
directory's check-release page in your signed-in browser (that visit queues the scan)
and waits until the listing shows the version.

After the first release, once: `npm run publish` says what is left on the site — reading
the review, the **Publish** click that takes the listing out of draft (the one step you
cannot quietly take back, and the owner's, never a script's), and the listing fields.

### The listing

The community site keeps a handful of fields the manifest has nowhere to put — tags, a
long description, a pricing model, a listing icon, screenshots. `listing.json` holds
them in the source tree, `npm run check:listing` validates them (`-- --remote` against
the live listing, which the Release workflow also does), and `publish` prints what to
type. Why they cannot live in
`manifest.json`, and what every field means, is in [the listing](listing.md).

## Localisation

`src/lang/strings.ts` is the English source of truth; `translations.ts` holds partial
overrides per locale, and anything missing falls back to English per key.

```bash
npm run newlocale -- de    # scaffold a locale across strings and docs
npm run labels             # what Obsidian's own UI is called, per locale
npm run stamp              # fill the {{SELECTOR}} language line
```

`npm run labels` reads Obsidian's own translation tables out of the app. That is the
authority for two things: which languages are worth translating into, and what the host's
own UI is called in each — documentation quoting a host label must quote *that*, not a
translation of the English.

Each translated document records the commit of the English source it was made from, so
`git log <hash>..HEAD -- <source>` shows exactly what it is missing.

## Reporting bugs

Include your Obsidian version, OS, theme, and the list of other enabled plugins.
