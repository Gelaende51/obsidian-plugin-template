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
npm run release -- 1.1.0     # gates, bumps, commits, tags. Pushes nothing.
git push && git push origin 1.1.0
npm run release:review       # the browser steps, in the right order
```

`release` stops at the tag deliberately: everything up to there is deterministic and
works anywhere. The community-site steps need a signed-in browser — the site
authenticates with email and password, so there is no token path — and a release command
that silently does less on a machine without a session is worse than one that never
tried.

The order in `release:review` is the point: the **preview scan comes before the release
is public**. The admin area's *Review branch* runs the submission review against any tag
without publishing, which turns it from a verdict into a pre-flight check. *Check for new
releases* is the separate control that promotes it — and it does not reliably happen by
itself.

`versions.json` is append-only. It is how an app too old for the current release finds
the newest one it can still run; deleting a line strands those users.

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
