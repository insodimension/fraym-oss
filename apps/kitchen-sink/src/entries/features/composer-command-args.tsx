import { type ArgumentCompletion, Composer, type SlashCommandOption } from "@fraym-ai/ui";
import { useState } from "react";
import { Demo, Note } from "../../showcase/demo";
import type { ShowcaseEntry } from "../../showcase/types";

/**
 * The staged pill + argument chips UX on the REAL Composer (this page previously
 * hosted the standalone proposal mock). Command specs mirror what the engine
 * advertises over ACP: declarative `subcommands` (+ usage) ride the command
 * records; dynamic flags arrive through `argumentCompletionSource` (the engine's
 * completions lane — `getArgumentCompletions` TUI parity). The composer derives
 * pill segments + chips from the value STRING, so drafts/echo/submit are
 * untouched.
 */

const COMMANDS: readonly SlashCommandOption[] = [
	{
		label: "/advisor",
		value: "/advisor",
		description: "Second-model advisor",
		kind: "command",
		subcommands: [
			{ name: "on", description: "Enable the advisor" },
			{ name: "off", description: "Disable the advisor" },
			{ name: "status", description: "Show advisor status" },
			{ name: "dump", description: "Copy the advisor's transcript to clipboard" },
		],
	},
	{
		label: "/mcp",
		value: "/mcp",
		description: "Manage MCP servers",
		kind: "command",
		subcommands: [
			{ name: "add", description: "Add a new MCP server", usage: "<name> <url>" },
			{ name: "list", description: "List all configured MCP servers" },
			{ name: "remove", description: "Remove an MCP server", usage: "<name>" },
			{ name: "test", description: "Test connection to a server", usage: "<name>" },
			{ name: "reauth", description: "Reauthorize OAuth for a server", usage: "<name>" },
		],
	},
	{
		label: "/sidequest",
		value: "/sidequest",
		description: "Run a background sidequest",
		kind: "extension",
		inputHint: "<work>",
	},
	{
		label: "/handoff",
		value: "/handoff",
		description: "Hand off session context to a new session",
		kind: "command",
		inputHint: "[focus instructions]",
	},
	{ label: "/status", value: "/status", description: "Show session status", kind: "command" },
];

// Emulates the engine's argument-completion lane for `/sidequest` with the real
// extension's semantics: rows carry the FULL args replacement (`replaceLastToken`),
// enum values complete after their flag, and completions stop once free text starts.
const SIDEQUEST_MODES = ["same", "worktree", "investigate"] as const;

const SIDEQUEST_FLAGS: readonly ArgumentCompletion[] = [
	{ label: "--mode", value: "--mode ", description: "Where the sidequest runs", hint: "same|worktree|investigate" },
	{ label: "--no-run", value: "--no-run ", description: "Prepare only, don't execute" },
	{ label: "--model", value: "--model ", description: "Model override", hint: "<selector>" },
];

function replaceLastToken(argsPrefix: string, replacement: string): string {
	if (/\s$/.test(argsPrefix) || argsPrefix === "") return `${argsPrefix}${replacement}`;
	return argsPrefix.replace(/\S+$/, replacement);
}

async function fakeArgumentCompletionSource(
	commandValue: string,
	argsPrefix: string,
): Promise<readonly ArgumentCompletion[]> {
	if (commandValue !== "/sidequest") return [];
	const tokens = argsPrefix.split(/\s+/).filter(Boolean);
	const endsWithSpace = /\s$/.test(argsPrefix) || argsPrefix === "";
	const last = tokens.at(-1) ?? "";
	const previous = tokens.at(-2) ?? "";
	// enum values right after `--mode`
	if (last === "--mode" || (previous === "--mode" && !endsWithSpace)) {
		const typed = last === "--mode" ? "" : last;
		const base = last === "--mode" ? (endsWithSpace ? argsPrefix : `${argsPrefix} `) : argsPrefix;
		return SIDEQUEST_MODES.filter(mode => mode.startsWith(typed)).map(mode => ({
			label: mode,
			value: last === "--mode" ? `${base}${mode} ` : replaceLastToken(argsPrefix, `${mode} `),
		}));
	}
	// flags while the current token is empty or dash-prefixed
	if (!endsWithSpace && last && !last.startsWith("-")) return [];
	const typed = endsWithSpace ? "" : last;
	return SIDEQUEST_FLAGS.filter(flag => flag.label.startsWith(typed)).map(flag => ({
		...flag,
		value: replaceLastToken(argsPrefix, flag.value),
	}));
}

function CommandArgsEntry() {
	const [value, setValue] = useState("");
	const [sent, setSent] = useState<readonly string[]>([]);

	return (
		<Demo
			summary="Staged pill + argument chips on the real Composer: committing a command keeps the menu open in an argument stage — declarative subcommands join the pill as a second segment (usage becomes the ghost placeholder), dynamic flags from the engine's completion lane become removable chips (enum values complete after their flag), free-text hints render as ghost placeholders, and zero-arg commands behave like before. Backspace on an empty editor pops the last chip/segment; the value string stays the single source of truth."
			importPath="@fraym-ai/ui/features/composer"
			stage="stretch"
		>
			<Note>
				Try: /advisor ⏎ (subcommands) · /mcp ⏎ add ⏎ (usage ghost) · /sidequest ⏎ (flags → chips, --mode drills
				values) · /handoff (free-text hint) · /status ⏎ ⏎. Backspace pops; Esc dismisses; raw typing always works.
			</Note>
			<div className="flex min-h-[420px] flex-col justify-end">
				{sent.length > 0 && (
					<div className="mx-auto mb-3 flex w-full max-w-[780px] flex-col gap-1">
						{sent.map((line, index) => (
							<div
								key={`${index}:${line}`}
								className="self-end rounded-[10px] bg-fr-surface-2 px-3 py-1.5 font-secondary text-sm text-fr-text-2"
							>
								{line}
							</div>
						))}
					</div>
				)}
				<Composer
					value={value}
					onChange={setValue}
					onSubmit={text => {
						setSent(prev => [...prev.slice(-4), text]);
						setValue("");
					}}
					slashCommands={COMMANDS}
					argumentCompletionSource={fakeArgumentCompletionSource}
					placeholder="Type / for commands…"
				/>
			</div>
		</Demo>
	);
}

export const composerCommandArgsEntries: readonly ShowcaseEntry[] = [
	{
		id: "composer-command-args",
		name: "Command arguments",
		Component: CommandArgsEntry,
	},
];
