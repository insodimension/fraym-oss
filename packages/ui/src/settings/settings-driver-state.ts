import { type FraymUiConfig, resolveFraymUiConfig } from "@fraym-ai/config";
import type { FraymConfigDriver, WorkspaceRef } from "@fraym-ai/driver";

type DriverSettingValue = Parameters<FraymConfigDriver["setValue"]>[2];

export async function loadDriverSettings(driver: FraymConfigDriver, workspace: WorkspaceRef): Promise<FraymUiConfig> {
	const snapshot = await driver.load(workspace);
	return resolveFraymUiConfig(snapshot.merged as Partial<FraymUiConfig>);
}

export function writeDriverSetting(
	driver: FraymConfigDriver | null,
	workspace: WorkspaceRef | null,
	key: string,
	value: DriverSettingValue,
): void {
	if (!driver || !workspace) return;
	void driver.setValue(workspace, key, value, "user").catch(() => {});
}

export async function resetDriverUserSettings(
	driver: FraymConfigDriver,
	workspace: WorkspaceRef,
	baseDefaults: FraymUiConfig,
): Promise<FraymUiConfig | null> {
	for (const key of Object.keys(baseDefaults)) await driver.unsetValue(workspace, key, "user").catch(() => {});
	const snapshot = await driver.load(workspace).catch(() => null);
	if (!snapshot) return null;
	return resolveFraymUiConfig(snapshot.merged as Partial<FraymUiConfig>);
}
