// LspLocationsBody — file-grouped location list for `lsp` references/definition/
// type_definition/implementation results.
//
// Mirrors the TUI renderer (engine .../lsp/render.ts → renderReferences): a count
// summary + per-file groups with location rows (line N, col N), with collapse logic.
//
// Self-contained (no coupling to Engine). See docs/design/tools/lsp.md §2.2 family 3.
//

import type { ReactNode } from "react";
import { ToolBodySection } from "../../tool-body-card";
import type { LocationFileGroup } from "./lsp-parse";

export interface LspLocationsBodyProps {
	readonly subKind: string;
	readonly count: number;
	readonly groups: LocationFileGroup[];
	readonly maxHeight?: number;
}

export function LspLocationsEmptyBody({ subKind }: { subKind: string }): ReactNode {
	return <p className="font-primary text-fr-sm text-fr-text-3">No {subKind} found</p>;
}

export function LspLocationsBody({ subKind, count, groups, maxHeight = 240 }: LspLocationsBodyProps): ReactNode {
	const stat = `${count} ${subKind}${count !== 1 ? "s" : ""}`;

	return (
		<ToolBodySection icon="code" title="Locations" stat={stat} maxHeight={maxHeight} padContent>
			<div className="grid gap-0.5">
				{groups.map((group, gi) => (
					<LocationsFileBlock key={gi} group={group} />
				))}
			</div>
		</ToolBodySection>
	);
}

function LocationsFileBlock({ group }: { group: LocationFileGroup }): ReactNode {
	const locWord = group.locations.length === 1 ? "reference" : "references";
	return (
		<div className="mb-1 last:mb-0">
			<p className="font-secondary text-fr-2xs text-fr-text-3 mb-0.5 fr-overflow">
				📄 {group.path}{" "}
				<span className="text-fr-text-3 opacity-60">
					{group.locations.length} {locWord}
				</span>
			</p>
			<div className="ml-2 grid gap-0.5">
				{group.locations.slice(0, 5).map((loc, i) => (
					<p key={i} className="font-secondary text-fr-xs text-fr-text-3">
						line {loc.line}, col {loc.col}
					</p>
				))}
				{group.locations.length > 5 && (
					<p className="font-secondary text-fr-xs text-fr-text-3 opacity-60">
						… {group.locations.length - 5} more
					</p>
				)}
			</div>
		</div>
	);
}
