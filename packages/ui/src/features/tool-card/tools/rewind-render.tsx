import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readResultContentText, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";

export const renderRewind: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const details = readField(call.output, "details") as Record<string, unknown> | undefined;
	const rewound = details?.rewound === true;
	const report = readStringField(call.input, "report")?.trim() || readStringField(details, "report")?.trim() || "";
	const errorText = readResultContentText(call.output) ?? "Rewind failed";
	const status =
		call.status === "error" ? "error" : call.status === "running" ? "pending" : rewound ? "success" : "warn";

	const badges: ReactNode[] = [
		<Badge key="status" variant="code" tone={rewound ? "add" : "del"}>
			{rewound ? "rewound" : "failed"}
		</Badge>,
	];
	const stat = call.status === "running" ? "pending" : rewound ? "rewound" : "failed";

	return {
		label: "Rewind",
		kind: "rewind",
		status,
		badges,
		stat,
		body:
			call.status === "running" ? (
				<ToolBodySection padContent>
					<div className="font-primary text-fr-sm text-fr-text-3 italic">Rewinding to checkpoint…</div>
				</ToolBodySection>
			) : call.status === "error" ? (
				<ToolBodySection padContent>
					<ToolBodyTerm lines={[["fail", errorText]]} />
				</ToolBodySection>
			) : report ? (
				<ToolBodySection padContent className="font-secondary text-fr-xs leading-[1.65]">
					<div className="font-primary text-fr-sm text-fr-text-2 leading-relaxed">{report}</div>
				</ToolBodySection>
			) : (
				<ToolBodySection padContent>
					<ToolBodyTerm lines={[["mute", "No report captured."]]} />
				</ToolBodySection>
			),
	};
};
