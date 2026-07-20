import type { AnalyticsDriver } from "./analytics-types";
import type { EngineConfigDriver } from "./config-types";
import type { FraymConfigDriver } from "./fraym-config-types";
import type { EngineResourceDriver } from "./resource-types";
import type { TerminalDriver } from "./terminal-types";
import type { SessionDriver } from "./session-driver";
import type { UsageDriver } from "./usage-types";
import type { WorkspaceDriver } from "./workspace-types";

export interface FraymDrivers {
	readonly session: SessionDriver;
	readonly resources?: EngineResourceDriver | null;
	readonly config?: EngineConfigDriver | null;
	readonly fraymConfig?: FraymConfigDriver | null;
	readonly workspace?: WorkspaceDriver | null;
	readonly terminal?: TerminalDriver | null;
	readonly analytics?: AnalyticsDriver | null;
	readonly usage?: UsageDriver | null;
}
