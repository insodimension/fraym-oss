import "./styles.css";

export { Icon, type IconProps, toolIconNode } from "./icons/icon";
export { type IconName, iconPaths } from "./icons/paths";
export { cn } from "./lib/cn";
export type { IconSpec } from "@fraym-ai/config";
export type { ActiveToolCall } from "./hooks/session-types";
export { type LineStream, useLineStream } from "./hooks/use-line-stream";

export { Fraym, type FraymProps, type FraymSettingsPanel } from "./fraym-root-core";
// Prop-shape types a host needs to configure the frame it mounts. `FraymProps`
// references these, so a consumer cannot build a `railActions` array without them.
export type { AppMode, RailActionDef, RailActionTarget } from "./shell/types";
export type { ModelPickerGroups } from "./deployment-gates";
export type { DockTab } from "./features/right-dock";
export { SessionProvider, type SessionProviderProps } from "./hooks/session-provider";
export { useSession, useSessionOptional, useVibr } from "./hooks/use-session";
export { ThreadMessage } from "./features/thread";
export { SessionThread, type SessionThreadProps } from "./SessionThread";
export { ApprovalCard, type ApprovalCardProps } from "./ApprovalCard";
export { ReasoningRow, type ReasoningRowProps } from "./ReasoningRow";
export {
  Composer,
  ComposerChip,
  ContextRadial,
  type ComposerImageAttachment,
  type ComposerProps,
} from "./features/composer";
export { ContextUsage } from "./Composer";
export {
  filterSlashCommands,
  getComposerKeyAction,
  slashQuery,
  type ComposerKeyAction,
  type ComposerKeyInput,
  type SlashCommand,
} from "./composer-state";
export { useAgentSession, type AgentSessionSnapshot } from "./useAgentSession";
export {
  accumulateToolOutput,
  createThreadState,
  reduceThreadEvent,
  type ThreadMessage as ThreadStateMessage,
  type ThreadMessageRole,
  type ThreadPhase,
  type ThreadState,
  type ThreadApproval,
  type ThreadItem,
  type ThreadReasoning,
  type ThreadToolCall,
  type ToolCallState,
} from "./thread-state";
export { ToolCall, type ToolCallProps } from "./tool-renderers/ToolCall";
export { ToolCard, type ToolCardProps } from "./tool-renderers/ToolCard";
export {
  createToolRendererRegistry,
  normalizeToolName,
  ToolRendererProvider,
  useToolRendererRegistry,
  type ToolRendererProviderProps,
} from "./tool-renderers/registry";
export { EditToolRenderer, ReadToolRenderer, WriteToolRenderer } from "./tool-renderers/file-renderers";
export { TaskToolRenderer } from "./tool-renderers/task-renderer";
export type {
  ToolRenderer,
  ToolRendererMap,
  ToolRendererRegistry,
} from "./tool-renderers/types";
export { tokens, type FraymColorToken, type FraymTokens } from "./tokens";
export * from "./elements";
export * from "./components";
export * from "./pages";
export * from "./registries";
export * from "./features";
// `features/message` and `registries` both surface message-block shapes; the
// registry versions are the canonical public ones.
export type { MessageBlock, MessageData } from "./registries";
export * from "./theme";
