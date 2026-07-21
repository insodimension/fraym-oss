import type { PluginFixKind } from "@fraym-ai/driver";
export { AgentSetup, type AgentSetupProps, agentSetupBrief } from "./agent-setup";
export { FormSheet, type FormSheetProps } from "./form-sheet";
export { InstallProgress, type InstallProgressProps } from "./install-progress";
export { OAuthPopup, type OAuthPopupProps, type OAuthController, type OAuthStatus } from "./oauth-popup";
export { WaitingForApp, type WaitingForAppProps } from "./waiting-for-app";
export const BUILT_FIX_KINDS = ["install", "form", "open-app", "agent", "oauth"] as const satisfies readonly PluginFixKind[];
