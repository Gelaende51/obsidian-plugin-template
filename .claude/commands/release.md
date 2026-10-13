---
description: Cut a release through the Release workflow
---

Release version $ARGUMENTS.

1. Check `CHANGELOG.md` has the entries under `## Unreleased`, and that every
   `docs/i18n/CHANGELOG.<lang>.md` has them translated as a pending section; translate
   what is missing first, and commit and push.
2. `npm run release -- $ARGUMENTS` — it checks readiness, starts the Release workflow and
   follows it: tests, preview scan, release commit and tag, attested release, and the
   community directory's scan, listing and recorded review.
3. Report what the run's summary says: the directory's review against the previous
   release (new findings, especially Warnings), and the listing's Health and Review.
4. If the `OBSIDIAN_COMMUNITY_COOKIE` secret is not set, `npm run release` opens the
   check-release page in my browser instead: I must be signed in. **Do not type the
   password**, even if I have given it to you; ask me to sign in.
5. After the first release only: `npm run publish` lists what is left on the site. The
   Publish click is mine — confirm with me before anything there.
