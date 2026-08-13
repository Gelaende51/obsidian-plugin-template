import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, TemplatePluginSettings } from "./settings";
import { TemplatePluginSettingTab } from "./settingsTab";
import { registerEntrypoints } from "./entrypoints";
import { setLanguage } from "./lang";

export default class TemplatePlugin extends Plugin {
	settings: TemplatePluginSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		setLanguage();
		await this.loadSettings();

		// Everything registered through `this.register*` is torn down for you
		// on unload. Anything else — a document listener, a timer, an element
		// inserted into UI you do not own — is yours to remove, and its removal
		// belongs in the same commit that adds it.
		registerEntrypoints(this);
		this.addSettingTab(new TemplatePluginSettingTab(this.app, this));
	}

	onunload(): void {
		// TODO: undo anything not covered by this.register*().
	}

	async loadSettings(): Promise<void> {
		const stored: unknown = (await this.loadData()) ?? {};
		// Only keys the plugin still has. A plain merge would carry a setting
		// from a removed feature forward for ever, since saveData writes back
		// whatever it was handed.
		const known = Object.entries(stored as Record<string, unknown>).filter(
			([key, value]) => key in DEFAULT_SETTINGS && value !== undefined,
		);
		this.settings = { ...DEFAULT_SETTINGS, ...Object.fromEntries(known) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
