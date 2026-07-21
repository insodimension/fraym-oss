import type { CompletionItem, EngineCommandRecord, SessionDriver, SessionRef } from "@fraym-ai/driver";
import { normalizeEngineCommandName } from "@fraym-ai/driver";
import { useEffect, useMemo, useState } from "react";
import type { SlashCommandOption } from "../features/composer";
import { useSessionOptional } from "./use-session";

const EMPTY_COMMANDS: readonly SlashCommandOption[] = [];
const EMPTY_RECORDS: ReadonlyMap<string, EngineCommandRecord> = new Map();
// The engine answers the command menu off the LEADING slash token. We query that
// token even when args follow ("/fast on" → "/fast"), so the command stays in the
// list while the user types arguments — which keeps the committed-command pill live
// AND lets the composer derive subcommand (argument) completions client-side. A
// newline means it is no longer a slash-command line (multi-line prose).
function slashCommandQuery(text: string): string | null {
	if (!text.startsWith("/") || text.includes("\n")) return null;
	const firstSpace = text.indexOf(" ");
	return firstSpace === -1 ? text : text.slice(0, firstSpace);
}

export function useSlashCommands(
	text: string,
	driverArg?: SessionDriver | null,
	sessionRefArg?: SessionRef | null,
): readonly SlashCommandOption[] {
	const session = useSessionOptional();
	const driver = driverArg !== undefined ? driverArg : (session?.driver ?? null);
	const sessionRef = sessionRefArg !== undefined ? sessionRefArg : (session?.sessionRef ?? null);
	const [commands, setCommands] = useState<readonly SlashCommandOption[]>(EMPTY_COMMANDS);
	const [records, setRecords] = useState<{
		readonly key: string | null;
		readonly map: ReadonlyMap<string, EngineCommandRecord>;
	}>({ key: null, map: EMPTY_RECORDS });
	const queryText = slashCommandQuery(text);

	useEffect(() => {
		if (!driver || !sessionRef || !queryText) {
			setCommands(previous => (previous.length === 0 ? previous : EMPTY_COMMANDS));
			return;
		}
		let active = true;
		void driver
			.queryCompletions(sessionRef, { text: queryText, cursor: queryText.length })
			.then(items => {
				if (!active) return;
				const next = items.map(toSlashOption);
				setCommands(previous => (sameSlashOptions(previous, next) ? previous : next));
			})
			.catch(() => {
				if (active) setCommands(previous => (previous.length === 0 ? previous : EMPTY_COMMANDS));
			});
		return () => {
			active = false;
		};
	}, [driver, sessionRef, queryText]);

	// Command metadata (declarative subcommands + the free-text input hint) rides
	// `available_commands_update`, not the per-keystroke completion payload — so join the
	// session's command records onto the completion options by normalized name. Fetched
	// when the slash menu OPENS (first "/" keystroke), not on mount: at mount the sidecar
	// is often still booting and `getSessionCommands` snapshots an empty catalog that a
	// once-per-session fetch would never refresh (the mount-time race that left options
	// without subcommands). Re-fetching per menu open also picks up plugin/command reloads;
	// the churn guard keeps re-renders at zero when nothing changed. Records are KEYED by
	// session so a stale catalog can never enrich another session's options.
	const sessionKey = driver && sessionRef ? JSON.stringify(sessionRef) : null;
	const menuOpen = queryText !== null;
	useEffect(() => {
		if (!driver || !sessionRef || sessionKey === null || !menuOpen) return;
		let active = true;
		void driver
			.getSessionCommands(sessionRef)
			.then(next => {
				if (!active) return;
				const map = new Map<string, EngineCommandRecord>();
				for (const record of next) map.set(normalizeEngineCommandName(record.name), record);
				setRecords(previous =>
					previous.key === sessionKey && sameCommandMeta(previous.map, map) ? previous : { key: sessionKey, map },
				);
			})
			.catch(() => {
				// Keep whatever we had; a transient failure must not strip working enrichment.
			});
		return () => {
			active = false;
		};
	}, [driver, sessionRef, sessionKey, menuOpen]);

	const activeRecords = records.key === sessionKey ? records.map : EMPTY_RECORDS;
	return useMemo(() => enrichWithCommandMeta(commands, activeRecords), [commands, activeRecords]);
}

function toSlashOption(item: CompletionItem): SlashCommandOption {
	return {
		label: item.label,
		value: item.value,
		description: item.detail,
		kind: item.kind,
		...(item.subcommands && item.subcommands.length > 0 ? { subcommands: item.subcommands } : {}),
		...(item.icon ? { icon: item.icon } : {}),
	};
}

function sameSubcommands(left: SlashCommandOption["subcommands"], right: SlashCommandOption["subcommands"]): boolean {
	if (left === right) return true;
	if (!left || !right || left.length !== right.length) return false;
	return left.every((sub, index) => {
		const other = right[index];
		return other?.name === sub.name && other.description === sub.description && other.usage === sub.usage;
	});
}

function sameSlashOptions(left: readonly SlashCommandOption[], right: readonly SlashCommandOption[]): boolean {
	return (
		left.length === right.length &&
		left.every((item, index) => {
			const other = right[index];
			return (
				other?.label === item.label &&
				other.value === item.value &&
				other.description === item.description &&
				other.kind === item.kind &&
				other.icon === item.icon &&
				sameSubcommands(other.subcommands, item.subcommands)
			);
		})
	);
}

// Attach the declarative subcommands + free-text input hint from the session's command
// records onto each completion option, keyed by normalized command name. Command-name
// completions don't carry this metadata on the hot lane, so this join is what lights up
// the argument chips + the committed-command ghost hint. Missing record => unchanged.
function enrichWithCommandMeta(
	options: readonly SlashCommandOption[],
	records: ReadonlyMap<string, EngineCommandRecord>,
): readonly SlashCommandOption[] {
	if (options.length === 0 || records.size === 0) return options;
	let changed = false;
	const next = options.map(option => {
		const record = records.get(normalizeEngineCommandName(option.value));
		if (!record || (record.subcommands === undefined && record.inputHint === undefined)) return option;
		changed = true;
		return {
			...option,
			...(record.subcommands ? { subcommands: record.subcommands } : {}),
			...(record.inputHint !== undefined ? { inputHint: record.inputHint } : {}),
		};
	});
	return changed ? next : options;
}

function sameCommandMeta(
	left: ReadonlyMap<string, EngineCommandRecord>,
	right: ReadonlyMap<string, EngineCommandRecord>,
): boolean {
	if (left === right) return true;
	if (left.size !== right.size) return false;
	for (const [name, record] of right) {
		const other = left.get(name);
		if (!other || other.inputHint !== record.inputHint || !sameSubcommands(other.subcommands, record.subcommands)) {
			return false;
		}
	}
	return true;
}
