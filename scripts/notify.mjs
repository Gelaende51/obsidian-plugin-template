/**
 * A desktop notification, because the interesting part of a release happens
 * minutes after the command returns.
 *
 * CI builds and the community-site scan both take long enough that you will
 * have moved on, and a release that quietly needs a browser step is a release
 * that sits half-finished. Best-effort by design: a machine with no notifier
 * gets the message on stdout and nothing fails.
 */
import { execFileSync } from "node:child_process";
import { platform } from "node:os";

export function notify(title, body) {
	console.log(`\n  ${title}\n  ${body}\n`);
	const quiet = { stdio: "ignore" };
	try {
		if (platform() === "darwin") {
			execFileSync("osascript", ["-e", `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`], quiet);
		} else if (platform() === "win32") {
			execFileSync("powershell", ["-NoProfile", "-Command",
				`[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime]; Write-Host ${JSON.stringify(body)}`], quiet);
		} else {
			execFileSync("notify-send", ["-a", "obsidian-plugin", title, body], quiet);
		}
	} catch {
		// No notifier installed, or a headless session. The console line above
		// already carried the message.
	}
}
