import { PartialStrings } from "./strings";

/**
 * Translations keyed by Obsidian's language code.
 *
 * English lives in `strings.ts` and is not repeated here. Add a locale with
 * `npm run newlocale <code>`, which scaffolds the block below *and* the
 * matching documentation files — `npm run check:lang` then fails until every
 * key is filled in, so a half-added language cannot ship.
 *
 * Partial entries are fine once a locale is established: anything missing
 * falls back to English per key (see `t()`). The check is strict only for a
 * locale you have just added, which is the moment the gap is cheapest to close.
 *
 * Which codes are worth adding: Obsidian ships its own translations inside
 * `obsidian.asar`, and `npm run labels` reads them. That list is the authority
 * for which languages the app actually supports — and for what Obsidian's own
 * UI is called in each, which any documentation quoting a host label needs.
 */
export const TRANSLATIONS: Record<string, PartialStrings> = {};
