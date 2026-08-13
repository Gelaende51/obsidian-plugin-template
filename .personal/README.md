# .personal

Everything local to *you* rather than to the plugin. Excluded from git in full.

| | |
| --- | --- |
| `personal.md` | Accounts and identifiers; `npm run init` pre-fills from it. Start from `personal.md.example`. |
| `vault/` | The Obsidian vault the test suites and screenshot capture run against. |

## Why the vault lives here

The suites and the capture script need a real vault with real notes, and that vault is
not shareable: it has your name in the path, your themes, your other plugins. Keeping it
inside the repository but outside git means the tooling can find it by a fixed relative
path — no absolute paths in scripts, and nothing about your machine in a commit.

One vault serving two roles has a rule attached: each use must leave it fit for the
other. Test suites create fixtures and toggle settings; the capture script refuses to
shoot while any of that is still visible. See `docs/development.md`.

## What this costs

`.personal/` is gitignored, so it is **not** carried by `gh repo create --template`. A
new plugin gets the convention — the ignore rule, the scripts that look here, the
documentation — but not the contents. Copy your `personal.md` and point `vault/` at a
vault yourself. That is the intended trade: the convention travels, your data does not.
