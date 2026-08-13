---
description: Add a language across strings and documentation
---

Add locale $ARGUMENTS.

1. `npm run newlocale -- $ARGUMENTS`
2. Fill in the empty strings in `src/lang/translations.ts`.
3. Translate the documentation bodies in `docs/i18n/`.
4. `npm run stamp && npm run check:lang && npm run check:docs`

Rules that matter more than fluency:

- **Never translate a plugin's name.** A name is a proper noun; only the grammar around
  it is localised.
- **Quote Obsidian's own UI labels from `npm run labels`**, per locale — not from
  memory, and not by translating the English yourself. A page that names a button the
  app does not is worse than an English one.
- Where Obsidian ships no translation for a language, say so in the file's header
  comment rather than inventing labels.
