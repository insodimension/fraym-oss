// Default surface renderers shipped with fraym-ui. The question-shaped host-UI
// kinds (select/permission/confirm AND input — the ask tool's typed text/number/
// slider questions ride `input`) are docked registrations (`placement: "docked"`)
// that render inline above the composer; only `editor` (a full text editor) stays
// modal. The registry resolver uses the exported `renderFallback` as its
// never-vanish tail (so no `"*"` entry is needed).

import type { ReactNode } from "react";
import { FallbackSurface } from "../features/approvals/fallback-surface";
import { type DialogHostUiRequest, HostUiDialog } from "../features/approvals/host-ui-dialog";
import { PermissionApprovalCard } from "../features/approvals/permission-approval-card";
import {
	ConfirmRequestPicker,
	InputRequestCard,
	SelectRequestPicker,
} from "../features/approvals/select-request-picker";
import { renderAdvisorNote } from "../features/message/advisor-note-surface";
import { renderAsyncResult } from "../features/message/async-result-surface";
import { renderBackgroundTanDispatch } from "../features/message/background-tan-dispatch-surface";
import { renderBtwAnswer } from "../features/message/btw-answer-surface";
import { renderFeedbackResult } from "../features/message/feedback-result-surface";
import { renderHandoffContext } from "../features/message/handoff-context-surface";
import { renderIrcMessage } from "../features/message/irc-message-surface";
import { renderLspLateDiagnostic } from "../features/message/lsp-late-diagnostic-surface";
import { renderSkillPrompt } from "../features/message/skill-prompt-surface";
import type { SurfaceRenderContext, SurfaceRendererEntry, SurfaceRenderInput } from "./surface-renderer-registry";

function renderDialog(input: SurfaceRenderInput, ctx: SurfaceRenderContext): ReactNode {
	if (input.channel !== "hostUi") return null;
	return <HostUiDialog request={input.request as DialogHostUiRequest} onRespond={ctx.respond} />;
}

/** The docked question renderer — select / confirm share the AskPicker; a
 * permission gate gets the distinct approval card (it is a decision about a
 * tool action, not a question — different anatomy, kind-styled actions). */
function renderDockedQuestion(input: SurfaceRenderInput, ctx: SurfaceRenderContext): ReactNode {
	if (input.channel !== "hostUi") return null;
	const request = input.request;
	switch (request.kind) {
		case "select":
			return <SelectRequestPicker request={request} onRespond={ctx.respond} />;
		case "permission":
			return <PermissionApprovalCard request={request} onRespond={ctx.respond} />;
		case "confirm":
			return <ConfirmRequestPicker request={request} onRespond={ctx.respond} />;
		case "input":
			// One surface for every ask question type: typed fields (text/number/
			// slider) and plain input elicitations dock inline — never a popup.
			return <InputRequestCard request={request} onRespond={ctx.respond} />;
		default:
			return renderFallback(input, ctx);
	}
}

export function renderFallback(input: SurfaceRenderInput, ctx: SurfaceRenderContext): ReactNode {
	return <FallbackSurface input={input} ctx={ctx} />;
}

export const DEFAULT_SURFACE_RENDERERS: Record<string, SurfaceRendererEntry> = {
	"hostUi:input": { render: renderDockedQuestion, placement: "docked" },
	"hostUi:editor": renderDialog,
	"hostUi:select": { render: renderDockedQuestion, placement: "docked" },
	"hostUi:permission": { render: renderDockedQuestion, placement: "docked" },
	"hostUi:confirm": { render: renderDockedQuestion, placement: "docked" },
	"msg:advisor": renderAdvisorNote,
	"msg:btw-answer": renderBtwAnswer,
	"msg:async-result": renderAsyncResult,
	"msg:background-tan-dispatch": renderBackgroundTanDispatch,
	"msg:feedback-result": renderFeedbackResult,
	"msg:handoff": renderHandoffContext,
	"msg:irc:incoming": renderIrcMessage,
	"msg:irc:relay": renderIrcMessage,
	"msg:irc:autoreply": renderIrcMessage,
	"msg:skill-prompt": renderSkillPrompt,
	"msg:lsp-late-diagnostic": renderLspLateDiagnostic,
};
