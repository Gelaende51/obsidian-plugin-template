import "obsidian";

/**
 * Typing for Obsidian API surface that is real but undocumented.
 *
 * The pattern, rather than any particular entry: declare the narrowest shape
 * you actually use, and guard every call site — an internal can change or
 * vanish in any release, and a plugin that throws on load because of one is
 * worse than a plugin missing the feature.
 *
 *   const explorer = app.internalPlugins?.getPluginById?.("file-explorer");
 *   if (explorer?.enabled) { ... }
 *
 * Delete this file if the plugin never reaches past the public API. Keeping
 * an empty augmentation around invites filling it.
 */
declare module "obsidian" {
	interface App {
		/** Undocumented. Guard both the property and the method before use. */
		internalPlugins?: {
			getPluginById(id: string): { enabled: boolean; instance?: unknown } | null;
		};
	}
}
