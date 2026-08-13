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
5. `npm run release:review` — the preview scan against the tag. Read the result and
   tell me what it says before going further.
6. Only once that is clean: `npm run publish`, which promotes the release and makes the
   listing public.

The community-site steps need Claude in Chrome connected and me already signed in —
the site has no token path. **Do not type the password**, even if I have given it to
you; ask me to sign in and take over from there.

`publish` is the one step that cannot be quietly undone. Confirm with me before it.
