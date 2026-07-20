import type { UsageStatus } from "@fraym/driver";
import { dotToneClass } from "../surface-kit";

export function usageStatusTone(status: UsageStatus): "accent" | "warn" | "del" | "mute" {
	switch (status) {
		case "ok":
			return "accent";
		case "warning":
			return "warn";
		case "exhausted":
			return "del";
		default:
			return "mute";
	}
}

export function usageStatusBarClass(status: UsageStatus): string {
	return dotToneClass(usageStatusTone(status));
}
