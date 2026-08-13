import { App, PluginSettingTab, Setting } from "obsidian";
import type TemplatePlugin from "./main";
import { t } from "./lang";

export class TemplatePluginSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: TemplatePlugin) {
		super(app, plugin);
	}

	// Still the imperative API. The declarative `getSettingDefinitions()` makes
	// settings searchable, but it needs minAppVersion 1.13.0 — five minor
	// versions above what a plugin like this actually requires. Adopting it
	// means either raising the floor that far or carrying both code paths and
	// keeping two descriptions of the same settings in step. The two lint
	// warnings are the accepted cost; revisit when your floor reaches 1.13.
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// One of each control, as a copy-paste reference. Names and
		// descriptions go through t() like everything else the user reads.
		new Setting(containerEl)
			.setName(t("settingGreetingName"))
			.setDesc(t("settingGreetingDesc"))
			.addText((text) =>
				text
					.setPlaceholder(t("noticeDefaultGreeting"))
					.setValue(this.plugin.settings.greeting)
					.onChange(async (value) => {
						this.plugin.settings.greeting = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t("settingRibbonName"))
			.setDesc(t("settingRibbonDesc"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showRibbonIcon).onChange(async (value) => {
					this.plugin.settings.showRibbonIcon = value;
					await this.plugin.saveSettings();
					// A ribbon icon cannot be added or removed after load, so
					// say so rather than letting the toggle appear to do nothing.
					this.display();
				}),
			);
	}
}
