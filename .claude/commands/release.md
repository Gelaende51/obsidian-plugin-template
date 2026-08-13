---
description: Cut a release, with the checks in the right order
---

Release version $ARGUMENTS.

1. `npm run release -- $ARGUMENTS` — gates, bumps manifest and versions.json, commits
   and tags. It stops there deliberately and pushes nothing.
2. Report what it said, especially any minAppVersion warning. Do not push past one
   without saying what it was.
3. On my go-ahead: `git push && git push origin $ARGUMENTS`.
4. Watch the release workflow and confirm the provenance attestation verified.
5. Then `npm run release:review` and follow it — the preview scan comes **before**
   promoting the release, not after.

Never run the community-site steps blind: they need a signed-in browser, and I do the
sign-in.
