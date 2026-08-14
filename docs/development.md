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

Three commands, in order, each less reversible than the last:

```bash
npm run release -- 1.1.0     # gates, bumps, commits, tags. Pushes nothing.
git push && git push origin 1.1.0
npm run release:review       # preview scan against the tag — read-only
npm run publish              # promote the release, then make the listing public
```

| Tier | What it touches | Undo |
| --- | --- | --- |
| `release` | Your working copy and a local tag | `git tag -d 1.1.0` |
| `release:review` | Nothing — it reads a scan of your tag | Nothing to undo |
| `publish` | The public listing | Not in the way the other two are |

`release` stops at the tag deliberately: everything up to there is deterministic and
works anywhere. It also raises a desktop notification, because CI and the community
scan both finish minutes after the command returns, and a release that quietly needs a
browser step is a release that sits half-finished.

The order is the point: the **preview scan happens before anything is public**. The
admin area's *Review branch* runs the submission review against any tag without
publishing, which turns it from a verdict into a pre-flight check. *Check for new
releases* is a separate control that promotes it — and it does not reliably happen by
itself. *Publish* is a third, and it is the one that cannot be quietly taken back.

### The browser steps need a signed-in session

`community.obsidian.md` authenticates with an email and password. There is no token, no
API key and no OAuth app, so **none of these steps can run in CI** and none of them can
be driven by a script holding a credential.

What works is driving a browser you are already signed into. With [Claude in
Chrome](https://claude.com/chrome) installed and connected (`/chrome` in a Claude Code
session), an agent can navigate the admin area, run the preview scan, read the result
back and press the controls — with one exception, which is deliberate:

> **Sign in yourself.** An agent should not type a password into a form, even one you
> handed it: a password entered outside a password manager is a credential used in a
> context that cannot be fully verified. Sign in, then hand the session over. Everything
> after that is automatable.

Without the extension, `release:review` and `publish` print the steps and the URLs and
you click them. That is the intended fallback — the scripts degrade to instructions
rather than to a silent no-op, so a release behaves the same everywhere and the part
that differs is visible.

`versions.json` is append-only. It is how an app too old for the current release finds
the newest one it can still run; deleting a line strands those users.

### The listing

The community site keeps a handful of fields the manifest has nowhere to put — tags, a
long description, a pricing model, a listing icon, screenshots. `listing.json` holds
them in the source tree, `npm run check:listing` validates them, and `publish` prints
what to type and then reads the public listing back. Why they cannot live in
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
