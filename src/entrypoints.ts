import { Notice, setIcon } from "obsidian";
import type TemplatePlugin from "./main";
import { t } from "./lang";

/**
 * The three cheap ways into a plugin: a command, a ribbon icon, a status bar
 * item. Registered through the plugin so Obsidian removes them on unload.
 *
 * `addStatusBarItem` returns an element Obsidian owns the lifetime of — it is
 * removed with the plugin — but anything *you* attach to it afterwards is not.
 */
export function registerEntrypoints(plugin: TemplatePlugin): void {
	plugin.addCommand({
		id: "say-hello",
		name: t("commandSayHello"),
		callback: () => {
			new Notice(plugin.settings.greeting || t("noticeDefaultGreeting"));
		},
	});

	if (plugin.settings.showRibbonIcon) {
		// Grep the app for the icon it uses for a similar job before picking
		// one: `setIcon` renders nothing at all for a name that is not bundled,
		// with no error to notice.
		const ribbon = plugin.addRibbonIcon("dice", t("ribbonTooltip"), () => {
			new Notice(plugin.settings.greeting || t("noticeDefaultGreeting"));
		});
		ribbon.addClass("my-plugin-ribbon");
	}

	const status = plugin.addStatusBarItem();
	status.addClass("my-plugin-status");
	setIcon(status.createSpan({ cls: "my-plugin-status-icon" }), "dice");
	status.createSpan({ text: t("statusBarLabel") });
}
