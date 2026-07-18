export type { CityItem } from "./cities";
export { CITY_CATEGORIES } from "./cities";
export {
	AST_EDIT_BROAD,
	AST_EDIT_MULTI,
	AST_EDIT_SINGLE,
	AST_GREP_BROAD,
	AST_GREP_CAPTURES,
	AST_GREP_NODE,
} from "./ast-operations";
export { FEATURE_DIRS, RENDER_FILES, ROOT_FILES } from "./file-tree";
export {
	BASE_PATH,
	CODE_FULL,
	CODE_RANGE,
	CODE_SUMMARY,
	DB_LISTING,
	DIR_LISTING,
	IMG_META,
	MD_TEXT,
	SEL_SUFFIX,
	URL_PREVIEW,
} from "./read-contents";
export { CONTENT_TEXT, CUSTOM_SUMMARY } from "./reasoning-traces";
export { CONTENT, INPUT, MULTI_FILE, SINGLE_FILE } from "./search-results";
export {
	DEPLOY_OUTPUT,
	INPUT as SSH_INPUT,
	RESTART_OUTPUT,
	SERVICE_DOWN,
	STATUS_OUTPUT,
	TRUNCATED_OUTPUT as SSH_TRUNCATED_OUTPUT,
	TRUNCATED_OUTPUT,
} from "./ssh-outputs";
export type { TodoPhase, TodoTask } from "./todo-phases";
export { PHASES_BY_VARIATION } from "./todo-phases";

export const SURFACE_TOKENS: { token: string; label: string }[] = [
	{ token: "--fr-bg", label: "bg" },
	{ token: "--fr-rail", label: "rail" },
	{ token: "--fr-surface", label: "surface" },
	{ token: "--fr-surface-2", label: "surface-2" },
	{ token: "--fr-surface-3", label: "surface-3" },
	{ token: "--fr-border", label: "border" },
	{ token: "--fr-border-soft", label: "border-soft" },
];
export const TEXT_TOKENS: { token: string; label: string }[] = [
	{ token: "--fr-text", label: "text" },
	{ token: "--fr-text-2", label: "text-2" },
	{ token: "--fr-text-3", label: "text-3" },
];
export const STATE_TOKENS: { token: string; label: string }[] = [
	{ token: "--fr-accent", label: "accent" },
	{ token: "--fr-accent-2", label: "accent-2" },
	{ token: "--fr-add", label: "add" },
	{ token: "--fr-del", label: "del" },
	{ token: "--fr-warn", label: "warn" },
	{ token: "--fr-blue", label: "blue" },
];
