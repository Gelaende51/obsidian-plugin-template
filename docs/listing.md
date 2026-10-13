# The listing

A published plugin has two descriptions of itself. `manifest.json` is the one that
ships: Obsidian reads it, the review validates it, every user downloads it. The other
lives only on `community.obsidian.md` — tags, a longer description, a pricing model, a
listing icon, screenshots — and it exists nowhere in the repository unless you put it
there.

`listing.json` is where this template puts it.

## Why not in `manifest.json`

The obvious place is the manifest, and it is the wrong one for three separate reasons.

- **The schema is closed.** [Obsidian's manifest reference][manifest] lists nine
  properties. The submission review validates against them, and none of the listing
  fields is among them. An unknown key is at best ignored and at worst a finding.
- **Comments would break the app.** The manifest is parsed with strict `JSON.parse` at
  plugin load. There is no annotation you can leave next to a value there — a `//`
  makes the plugin fail to load, not a linter complain.
- **It is the wrong lifecycle.** Manifest fields change with a version and are shipped
  to every user. Tags and a listing icon change when you change your mind about them,
  are set once, and belong to nobody's download.

So: a separate file, read by nothing but `obsidian-check-listing` (obsidian-toolkit). Because only our
own tooling parses it, keys beginning with `_` can carry the explanation next to the
value it explains — the annotation that `manifest.json` cannot have.

[manifest]: https://docs.obsidian.md/Reference/Manifest

## The fields

These are the controls on `community.obsidian.md/account/plugins/<id>/edit`, and the
`PATCH /api/entries/<id>` it sends. The names in `listing.json` are the names in that
payload, so the file reads as *what the form will send* rather than as a translation of
it.

| Field | Limit | Notes |
| --- | --- | --- |
| `tags` | 3 | Ordered — the form lets you drag them. `npm run tags` lists the 76 accepted values. |
| `pricing` | `free`, `paid`, `optional-payment` | Defaults to `free`. |
| `payment_description` | 1000 chars | Only shown when `pricing` is not `free`. |
| `long_desc` | 1000 chars | Optional. The listing renders your README below it anyway. |
| `lucide_icon_name` + `icon_color` | — | The listing badge. Unset, the site picks — which is why unset listings all have a house on red. |
| `short_desc` | 200 chars | **Not yours to set here.** Taken from `manifest.json`'s `description`. |
| Screenshots | — | Uploaded through the form; the site stores them by id. The first is the card image in search results. |
| Private source | — | Points the listing at a private mirror via a GitHub App. An authorisation, not a value. |

Anything the site fills in by itself — version, dates, download count, platforms,
licence, the issue-tracker links, the repository — is derived from the manifest, the
repository or the release, and does not belong in `listing.json` at all. The rule the
checker enforces is simple: **if the site can work it out, do not keep a second copy**.

## Keeping it true

```bash
npm run check:listing            # validate the file
npm run check:listing -- --remote  # and diff it against the live listing
npm run tags                     # the accepted tag vocabulary
npm run tags -- --refresh        # re-read that vocabulary from the site
```

Nothing here writes to the site. The edit form saves with a session cookie and the site
has no token path, so a script cannot hold a credential that would let it. What the
scripts do instead is hold the intended values, refuse the ones the form would reject
before you type them, and — after you have typed them — read the public listing back
and say whether it agrees. `publish` runs the remote check and prints the values, so
the form is filled in from the source tree rather than from memory.

The tag vocabulary is not documented anywhere. It is compiled into the site's own
JavaScript, and obsidian-toolkit's `obsidian-listing-tags` holds a copy read from there, with
a `--refresh` that reads it again and reports what moved. A committed copy that cannot
be re-derived is a copy that rots; one that can is a cache.
