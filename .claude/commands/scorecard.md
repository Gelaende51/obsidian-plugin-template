---
description: Fetch the public scorecard and say what changed
---

Fetch `https://community.obsidian.md/plugins/<id from manifest.json>` and report the
scorecard: health, review rating, and the counts under Passed / Warnings / Disclosures.

Then compare against what `npm run lint` says locally and explain any difference.
They disagree by construction — the review lints without this repository's
devDependencies, so anything typed through a `@types/*` package degrades to `any`
there and trips type-aware rules that do not fire here. Say which findings are that,
and which are real.
