/** Everything the user can change, and what it is before they do. */
export interface TemplatePluginSettings {
	/** Shown in the status bar; empty hides the item entirely. */
	greeting: string;
	/** Whether the ribbon icon is drawn at all. */
	showRibbonIcon: boolean;
}

export const DEFAULT_SETTINGS: TemplatePluginSettings = {
	greeting: "",
	showRibbonIcon: true,
};
