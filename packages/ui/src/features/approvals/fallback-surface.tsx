// FallbackSurface — the registry's never-vanish tail for host-UI requests. It
// guarantees an unknown/new `ui.*` kind is still SHOWN (and dismissable) rather
// than silently dropped when Engine adds something new. (Custom messages fall back to
// the normal message body in thread-message, so there is no message branch here.)

import type { HostUiRequest, HostUiResponse } from "@fraym-ai/driver";
import type { SurfaceRenderContext, SurfaceRenderInput } from "../../registries/surface-renderer-registry";

export interface FallbackSurfaceProps {
	readonly input: SurfaceRenderInput;
	readonly ctx: SurfaceRenderContext;
}

export function FallbackSurface({ input, ctx }: FallbackSurfaceProps) {
	if (input.channel !== "hostUi") return null;
	return <FallbackHostUi request={input.request} onRespond={ctx.respond} />;
}

function fallbackTitle(request: HostUiRequest): string {
	return "title" in request && request.title ? request.title : request.kind;
}

function fallbackBody(request: HostUiRequest): string | undefined {
	if ("message" in request && request.message) return request.message;
	if ("placeholder" in request && request.placeholder) return request.placeholder;
	if ("text" in request && request.text) return request.text;
	return undefined;
}

/** Unknown host-UI kind → a minimal modal card whose only safe action is Dismiss. */
function FallbackHostUi({ request, onRespond }: { request: HostUiRequest; onRespond: (r: HostUiResponse) => void }) {
	const title = fallbackTitle(request);
	const body = fallbackBody(request);
	const dismiss = () => onRespond({ requestId: request.requestId, cancelled: true });
	return (
		<div data-slot="fallback-surface" className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
			<button
				type="button"
				aria-label="Dismiss"
				className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
				onClick={dismiss}
			/>
			<div
				role="dialog"
				aria-modal={true}
				aria-label={title}
				className="relative w-[min(480px,92vw)] rounded-[var(--fr-r)] border border-fr-border bg-fr-surface p-4 shadow-xl"
			>
				<div className="mb-1 text-fr-base font-semibold text-fr-text">{title}</div>
				{body ? <div className="mb-3 text-fr-text-3">{body}</div> : null}
				<div className="flex justify-end">
					<button
						type="button"
						onClick={dismiss}
						className="rounded-[var(--fr-r)] border border-fr-border px-3 py-1.5 text-fr-text hover:bg-fr-surface"
					>
						Dismiss
					</button>
				</div>
			</div>
		</div>
	);
}
