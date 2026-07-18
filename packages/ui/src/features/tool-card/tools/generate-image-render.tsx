import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readStringField, toTermLines } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ImageBlock } from "../../message/messages/image-block";
import { ToolBodyCard, ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";
import { EditErrorBody } from "./bodies/edit-diff-body";
import { readNumberField } from "./renderer-utils";

interface InlineImage {
	data: string;
	mimeType: string;
}

interface GenerateImageModel {
	readonly details: unknown;
	readonly isError: boolean;
	readonly text: string;
	readonly subject?: string | undefined;
	readonly aspectRatio?: string | undefined;
	readonly imageSize?: string | undefined;
	readonly provider?: string | undefined;
	readonly model?: string | undefined;
	readonly images: readonly InlineImage[];
	readonly imagePreview?: InlineImage | undefined;
	readonly imageCount: number;
	readonly responseText?: string | undefined;
	readonly revisedPrompt?: string | undefined;
}

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

function readGeneratedImages(details: unknown): InlineImage[] {
	const images = readField(details, "images");
	if (!Array.isArray(images)) return [];
	return (images as Array<unknown>)
		.filter((image): image is Record<string, unknown> => typeof image === "object" && image !== null)
		.filter(image => typeof image.data === "string" && image.data.length > 0)
		.map(image => ({
			data: image.data as string,
			mimeType: readStringField(image, "mimeType") ?? "image/png",
		}));
}

function readImagePreview(details: unknown): InlineImage | undefined {
	const preview = readField(details, "imagePreview");
	if (!preview || typeof preview !== "object") return undefined;
	const data = readStringField(preview, "data");
	if (!data) return undefined;
	return { data, mimeType: readStringField(preview, "mimeType") ?? "image/png" };
}

function readGenerateImageModel(call: ActiveToolCall): GenerateImageModel {
	const details = readField(call.output, "details");
	const images = readGeneratedImages(details);
	return {
		details,
		isError: readField(call.output, "isError") === true,
		text: readOutputText(call.output),
		subject: readStringField(call.input, "subject"),
		aspectRatio: readStringField(call.input, "aspect_ratio"),
		imageSize: readStringField(call.input, "image_size"),
		provider: readStringField(details, "provider"),
		model: readStringField(details, "model"),
		images,
		imagePreview: readImagePreview(details),
		imageCount: readNumberField(details, "imageCount") ?? images.length,
		responseText: readStringField(details, "responseText"),
		revisedPrompt: readStringField(details, "revisedPrompt"),
	};
}

function decodeSvg(svgB64: string): string {
	try {
		const text = atob(svgB64);
		const match = text.match(/<svg[\s\S]*<\/svg>/i);
		return match?.[0] ?? "";
	} catch {
		return "";
	}
}

function ImageFrame({ image, alt }: { readonly image: InlineImage; readonly alt?: string }) {
	if (image.mimeType.startsWith("image/svg")) {
		const svgMarkup = decodeSvg(image.data);
		if (!svgMarkup) return null;
		return (
			<div
				dangerouslySetInnerHTML={{ __html: svgMarkup }}
				className="max-h-80 w-auto overflow-hidden rounded-lg border border-fr-border-soft bg-fr-surface p-2"
				style={{ maxHeight: 320 }}
			/>
		);
	}
	return (
		<div className="overflow-hidden rounded-lg border border-fr-border-soft">
			<ImageBlock src={`data:${image.mimeType};base64,${image.data}`} alt={alt ?? ""} />
		</div>
	);
}

function ImageGallery({ images }: { readonly images: readonly InlineImage[] }) {
	if (images.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-3 p-3">
			{images.map((image, index) => (
				<ImageFrame key={`img-${index}`} image={image} alt={`Generated image ${index + 1}`} />
			))}
		</div>
	);
}

function generateImageStatus(call: ActiveToolCall, imageCount: number): Pick<ToolView, "status" | "stat"> {
	if (call.status === "error") return { status: "error", stat: "failed" };
	if (call.status === "running") return { status: "pending", stat: "running" };
	const stat = imageCount > 0 ? `${imageCount} image${imageCount !== 1 ? "s" : ""}` : "done";
	return { status: "success", stat };
}

function optionalBadge(value: string | undefined, key: string, tone: "accent" | "blue" | "mute"): ReactNode | null {
	if (!value) return null;
	return (
		<Badge key={key} variant="code" tone={tone}>
			{value}
		</Badge>
	);
}

function generateImageBadges(model: GenerateImageModel): ReactNode[] {
	return [
		optionalBadge(model.aspectRatio, "ratio", "blue"),
		optionalBadge(model.imageSize, "size", "mute"),
		optionalBadge(model.provider, "provider", "accent"),
		optionalBadge(model.model, "model", "mute"),
	].filter((badge): badge is ReactNode => badge !== null);
}

const GENERATE_BODY_MAX_HEIGHT = 240;

function maybeTextSection(key: string, title: string, text: string | undefined, maxHeight: number): ReactNode | null {
	if (!text) return null;
	return (
		<ToolBodySection key={key} title={title} padContent maxHeight={maxHeight}>
			<ToolBodyTerm lines={toTermLines(text)} />
		</ToolBodySection>
	);
}

function textSections(model: GenerateImageModel): ReactNode[] {
	return [
		maybeTextSection("subj", "Subject", model.subject, 80),
		maybeTextSection("revised", "Revised prompt", model.revisedPrompt, 120),
		maybeTextSection("response", "Response", model.responseText || model.text, GENERATE_BODY_MAX_HEIGHT),
	].filter((section): section is ReactNode => section !== null);
}

function imageSections(model: GenerateImageModel): ReactNode[] {
	const preview = model.imagePreview ?? model.images[0];
	const sections: ReactNode[] = [];
	if (preview) sections.push(<ImageFrame key="preview" image={preview} alt="Generated image" />);
	if (model.images.length > 1) sections.push(<ImageGallery key="gallery" images={model.images} />);
	return sections;
}

function hasGenerateText(model: GenerateImageModel): boolean {
	return Boolean(model.subject || model.revisedPrompt || model.responseText || model.text);
}

function generateImageBody(model: GenerateImageModel): ReactNode {
	if (model.isError) return <EditErrorBody message={model.text || "request failed"} />;
	if (!model.imagePreview && model.images.length === 0 && !hasGenerateText(model)) {
		return <div className="px-1 py-2 font-secondary text-fr-xs text-fr-text-3">no output</div>;
	}
	const sections = imageSections(model);
	if (hasGenerateText(model)) sections.push(<ToolBodyCard key="text-card">{textSections(model)}</ToolBodyCard>);
	return <div className="space-y-1">{sections}</div>;
}

const renderGenerateImage: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const model = readGenerateImageModel(call);
	return {
		kind: "command",
		label: "Generate Image",
		badges: generateImageBadges(model),
		...generateImageStatus(call, model.imageCount),
		body: generateImageBody(model),
	};
};

export { renderGenerateImage };
