import { Component, type ErrorInfo, type ReactNode, useState } from "react";
import { cn } from "../lib/cn";
import { Button } from "./button";

export interface ErrorBoundaryFallbackProps {
	readonly error: Error;
	/** Clear the caught error and re-mount the subtree — recover without a full reload. */
	readonly reset: () => void;
}

export interface ErrorBoundaryProps {
	readonly children: ReactNode;
	/** Custom recovery UI. Receives the caught error + a `reset` to re-mount children. */
	readonly fallback?: (props: ErrorBoundaryFallbackProps) => ReactNode;
	/** Side-effect on catch (telemetry / persistent log). MUST NOT throw. */
	readonly onError?: (error: Error, info: ErrorInfo) => void;
	/** When any value here changes after an error, the boundary auto-resets — e.g.
	 *  pass the active session ref so navigating away clears a broken view. */
	readonly resetKeys?: readonly unknown[];
	/** Heading for the default fallback. */
	readonly title?: string;
	/** Supporting line for the default fallback. */
	readonly description?: string;
	readonly className?: string;
}

interface ErrorBoundaryState {
	readonly error: Error | null;
}

function keysChanged(a: readonly unknown[] | undefined, b: readonly unknown[] | undefined): boolean {
	if (a === b) return false;
	if (!a || !b || a.length !== b.length) return true;
	for (let i = 0; i < a.length; i++) {
		if (!Object.is(a[i], b[i])) return true;
	}
	return false;
}

/**
 * Catches render/lifecycle errors in its subtree and shows inline recovery UI
 * instead of letting React unmount the whole tree to a blank screen. Only class
 * components can be error boundaries, so this stays a class by necessity.
 *
 * `onError` is the seam for persistence (the desktop shell forwards it to a file
 * log); the default fallback offers Reload / Try again / Copy details.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		this.props.onError?.(error, info);
	}

	componentDidUpdate(prev: ErrorBoundaryProps): void {
		if (this.state.error && keysChanged(prev.resetKeys, this.props.resetKeys)) {
			this.reset();
		}
	}

	reset = (): void => {
		this.setState({ error: null });
	};

	render(): ReactNode {
		const { error } = this.state;
		if (!error) return this.props.children;
		if (this.props.fallback) return this.props.fallback({ error, reset: this.reset });
		return (
			<DefaultErrorFallback
				error={error}
				reset={this.reset}
				{...(this.props.title !== undefined ? { title: this.props.title } : {})}
				{...(this.props.description !== undefined ? { description: this.props.description } : {})}
				{...(this.props.className !== undefined ? { className: this.props.className } : {})}
			/>
		);
	}
}

function DefaultErrorFallback({
	error,
	reset,
	title,
	description,
	className,
}: ErrorBoundaryFallbackProps & {
	readonly title?: string;
	readonly description?: string;
	readonly className?: string;
}) {
	const [copied, setCopied] = useState(false);
	const details = error.stack || error.message || String(error);
	const copy = () => {
		try {
			void navigator.clipboard?.writeText(details).then(
				() => setCopied(true),
				() => undefined,
			);
		} catch {
			// clipboard unavailable — ignore
		}
	};
	return (
		<div
			role="alert"
			data-slot="error-boundary"
			className={cn("flex h-full w-full items-center justify-center p-6", className)}
		>
			<div className="w-full max-w-[440px] animate-[fr-pop-in_0.14s_ease] rounded-[12px] border border-fr-border bg-fr-surface p-5 shadow-[0_18px_60px_rgba(0,0,0,0.5)]">
				<div className="text-fr-base font-semibold text-fr-text">{title ?? "Something went wrong"}</div>
				<p className="mt-1.5 text-fr-sm text-fr-text-2">
					{description ?? "This view hit an unexpected error. Try again, or reload the app."}
				</p>
				<pre className="mt-3 max-h-[160px] overflow-auto whitespace-pre-wrap break-words rounded-[8px] border border-fr-border-soft bg-fr-surface-2 p-2.5 text-fr-xs leading-[1.5] text-fr-text-2">
					{error.message || String(error)}
				</pre>
				<div className="mt-4 flex items-center gap-2">
					<Button onClick={() => window.location.reload()}>Reload</Button>
					<Button variant="outline" onClick={reset}>
						Try again
					</Button>
					<Button variant="ghost" onClick={copy}>
						{copied ? "Copied" : "Copy details"}
					</Button>
				</div>
			</div>
		</div>
	);
}
