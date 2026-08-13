# .personal

Everything local to *you* rather than to the plugin. Excluded from git in full.

| | |
| --- | --- |
| `personal.md` | Accounts and identifiers; `npm run init` pre-fills from it. Start from `personal.md.example`. |
| `<your vault>/` | The Obsidian vault the test suites and screenshot capture run against. Keep its own name — see below. |

## Why the vault lives here

The suites and the capture script need a real vault with real notes, and that vault is
not shareable: it has your name in the path, your themes, your other plugins. Keeping it
inside the repository but outside git means nothing about your machine reaches a commit,
and the vault sits next to the plugin it is for rather than somewhere else entirely.

**Keep the vault's own name.** Obsidian names a vault after its directory, and the
harness picks its window by that name (`OBSIDIAN_VAULT`, matched against the window
title). A directory called `vault` gives every plugin's test vault the same name, and
the harness then cannot tell two open windows apart — it refuses rather than guessing,
which is correct and also unhelpful. A distinctive name costs nothing and removes the
problem.

One vault serving two roles has a rule attached: each use must leave it fit for the
other. Test suites create fixtures and toggle settings; the capture script refuses to
shoot while any of that is still visible. See `docs/development.md`.

## What this costs

`.personal/` is gitignored, so it is **not** carried by `gh repo create --template`. A
new plugin gets the convention — the ignore rule, the scripts that look here, the
documentation — but not the contents. Copy your `personal.md` and put a vault here
yourself. That is the intended trade: the convention travels, your data does not.
