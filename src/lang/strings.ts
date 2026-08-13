/**
 * Every user-facing string in the plugin. English is the source of truth: each
 * locale supplies a partial override, and anything missing falls back here, so
 * an incomplete translation degrades to English rather than to a blank label.
 *
 * Placeholders use {name} and are substituted by `t()`.
 *
 * Nothing the user reads may be written inline in a component. Add the key
 * here first — `npm run check:lang` will then tell you which locales are
 * missing it.
 */
export const EN = {
	// Settings
	settingGreetingName: "Greeting",
	settingGreetingDesc: "Shown when the command runs. Empty uses the default.",
	settingRibbonName: "Show ribbon icon",
	settingRibbonDesc: "Takes effect after the plugin is reloaded.",

	// Entry points
	commandSayHello: "Say hello",
	ribbonTooltip: "Say hello",
	statusBarLabel: "Ready",

	// Notices
	noticeDefaultGreeting: "Hello from {plugin}.",
} as const;

export type StringKey = keyof typeof EN;
export type Strings = Record<StringKey, string>;
/** A locale need only override the strings it has translated. */
export type PartialStrings = Partial<Strings>;
