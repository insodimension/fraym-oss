// `inspect_image` tool renderer — sends an image to a vision model for analysis.
// TUI: `inspectImageToolRenderer` in engine .../tools/inspect-image-renderer.ts.
// Shows the image being inspected, plus question + analysis text.
// No streaming (`_onUpdate` is unused). mergeCallAndResult.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readStringField, toTermLines } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ImageBlock } from "../../message/messages/image-block";
import { ToolBodyCard, ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";
import { EditErrorBody } from "./bodies/edit-diff-body";

// ─── Defensive Parse ──────────────────────────────────────────────────────

function readOutputText(output: unknown): string {
	if (typeof output === "string") return output;
	const content = readField(output, "content");
	if (!Array.isArray(content)) return "";
	return (content as Array<unknown>)
		.filter((part): part is { type: string; text?: string } => typeof part === "object" && part !== null)
		.filter(part => part.type === "text")
		.map(part => part.text ?? "")
		.filter(Boolean)
		.join("\n");
}

interface InlineImage {
	data: string;
	mimeType: string;
}

function readImagePreview(details: unknown): InlineImage | undefined {
	const preview = readField(details, "imagePreview");
	if (!preview || typeof preview !== "object") return undefined;
	const data = readStringField(preview, "data");
	if (!data) return undefined;
	return { data, mimeType: readStringField(preview, "mimeType") ?? "image/png" };
}

/** The inspected image: the content-lane array the driver reconstructs onto
 *  `details.images` (real pixels), falling back to a legacy `imagePreview`. */
function readInspectImage(details: unknown): InlineImage | undefined {
	const images = readField(details, "images");
	if (Array.isArray(images)) {
		const first = images.find(
			(img): img is Record<string, unknown> =>
				typeof img === "object" && img !== null && typeof (img as Record<string, unknown>).data === "string",
		);
		if (first) return { data: first.data as string, mimeType: readStringField(first, "mimeType") ?? "image/png" };
	}
	return readImagePreview(details);
}

// ─── Image rendering (inline SVG for SVGs, ImageBlock for raster) ─────────

/** Decode a base64 SVG string to raw markup. SVG data URIs in <img> are blocked by Chromium. */
function decodeSvg(svgB64: string): string {
	try {
		const text = atob(svgB64);
		const match = text.match(/<svg[\s\S]*<\/svg>/i);
		return match?.[0] ?? "";
	} catch {
		return "";
	}
}

/** Render image with proper border, supporting inline SVG (avoids Chromium SVG-in-img block). */
function RenderedImage({ image, alt }: { readonly image: InlineImage; readonly alt?: string }) {
	if (image.mimeType.startsWith("image/svg")) {
		const svgMarkup = decodeSvg(image.data);
		if (!svgMarkup) return null;
		return (
			<div
				dangerouslySetInnerHTML={{ __html: svgMarkup }}
				className="max-h-72 w-auto overflow-hidden rounded-lg border border-fr-border-soft bg-fr-surface p-2"
			/>
		);
	}
	return (
		<div className="overflow-hidden rounded-lg border border-fr-border-soft">
			<ImageBlock src={`data:${image.mimeType};base64,${image.data}`} alt={alt ?? ""} />
		</div>
	);
}

// ─── Renderer ─────────────────────────────────────────────────────────────

const INSPECT_BODY_MAX_HEIGHT = 240;

function inspectCardState(status: ActiveToolCall["status"]): Pick<ToolView, "status" | "stat"> {
	if (status === "error") return { status: "error", stat: "failed" };
	if (status === "running") return { status: "pending", stat: "running" };
	return { status: "success", stat: "done" };
}

function buildInspectBadges({
	path,
	model,
	mimeType,
}: {
	readonly path?: string | undefined;
	readonly model?: string | undefined;
	readonly mimeType?: string | undefined;
}): ReactNode[] {
	const badges: ReactNode[] = [];
	if (path) {
		badges.push(
			<Badge key="path" variant="code" tone="mute">
				{path}
			</Badge>,
		);
	}
	if (model) {
		badges.push(
			<Badge key="model" variant="code" tone="blue">
				{model}
			</Badge>,
		);
	}
	if (mimeType) {
		badges.push(
			<Badge key="mime" variant="code" tone="mute">
				{mimeType}
			</Badge>,
		);
	}
	return badges;
}

function pushInspectSections({
	sections,
	imagePreview,
	question,
	text,
}: {
	readonly sections: ReactNode[];
	readonly imagePreview?: InlineImage | undefined;
	readonly question?: string | undefined;
	readonly text: string;
}): void {
	if (imagePreview) {
		sections.push(<RenderedImage key="preview" image={imagePreview} alt="Inspected image" />);
	}
	if (question) {
		sections.push(
			<ToolBodySection key="question" title="Question" padContent maxHeight={80}>
				<ToolBodyTerm lines={toTermLines(question)} />
			</ToolBodySection>,
		);
	}
	if (text) {
		sections.push(
			<ToolBodySection key="analysis" title="Analysis" padContent maxHeight={INSPECT_BODY_MAX_HEIGHT}>
				<ToolBodyTerm lines={toTermLines(text)} />
			</ToolBodySection>,
		);
	}
}

function renderInspectBody({
	isError,
	text,
	imagePreview,
	question,
}: {
	readonly isError: boolean;
	readonly text: string;
	readonly imagePreview?: InlineImage | undefined;
	readonly question?: string | undefined;
}): ReactNode {
	if (isError) return <EditErrorBody message={text || "request failed"} />;
	const sections: ReactNode[] = [];
	pushInspectSections({ sections, imagePreview, question, text });
	if (sections.length === 0)
		return <div className="px-1 py-2 font-secondary text-fr-xs text-fr-text-3">no output</div>;
	return <ToolBodyCard>{sections}</ToolBodyCard>;
}

const renderInspectImage: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const details = readField(call.output, "details");
	const isError = readField(call.output, "isError") === true;
	const text = readOutputText(call.output);
	const path = readStringField(call.input, "path");
	const question = readStringField(call.input, "question");
	const model = readStringField(details, "model");
	const mimeType = readStringField(details, "mimeType");
	const imagePreview = readInspectImage(details);
	const { status, stat } = inspectCardState(call.status);
	const badges = buildInspectBadges({ path, model, mimeType });
	const body = renderInspectBody({ isError, text, imagePreview, question });

	return {
		kind: "read",
		label: "Inspect Image",
		badges,
		status,
		stat,
		body,
	};
};

export { renderInspectImage };
