import { Component, type ErrorInfo, type ReactNode, useState } from "react";

import { Button } from "./Button";
import { classNames } from "./utils";

export interface ErrorBoundaryFallbackProps { error: Error; reset: () => void }
export interface ErrorBoundaryProps { children: ReactNode; fallback?: (props: ErrorBoundaryFallbackProps) => ReactNode; onError?: (error: Error, info: ErrorInfo) => void; resetKeys?: readonly unknown[]; title?: string; description?: string; className?: string }
interface ErrorBoundaryState { error: Error | null }

function keysDiffer(previous: readonly unknown[] | undefined, next: readonly unknown[] | undefined): boolean { if (previous === next) return false; if (!previous || !next || previous.length !== next.length) return true; return previous.some((value, index) => !Object.is(value, next[index])); }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo): void { this.props.onError?.(error, info); }
  componentDidUpdate(previous: ErrorBoundaryProps): void { if (this.state.error && keysDiffer(previous.resetKeys, this.props.resetKeys)) this.reset(); }
  reset = (): void => this.setState({ error: null });
  render(): ReactNode { const { error } = this.state; if (!error) return this.props.children; return this.props.fallback?.({ error, reset: this.reset }) ?? <DefaultFallback error={error} reset={this.reset} {...(this.props.title ? { title: this.props.title } : {})} {...(this.props.description ? { description: this.props.description } : {})} {...(this.props.className ? { className: this.props.className } : {})} />; }
}

function DefaultFallback({ error, reset, title, description, className }: ErrorBoundaryFallbackProps & { title?: string; description?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const details = error.stack ?? error.message;
  const copy = async () => { try { await navigator.clipboard.writeText(details); setCopied(true); } catch { setCopied(false); } };
  return <div className={classNames("fraym-error-boundary", className)} data-slot="error-boundary" role="alert"><div className="fraym-error-boundary__panel"><strong>{title ?? "Something went wrong"}</strong><p>{description ?? "This view hit an unexpected error. Try again, or reload the app."}</p><pre>{error.message}</pre><div><Button variant="primary" onClick={() => window.location.reload()}>Reload</Button><Button variant="secondary" onClick={reset}>Try again</Button><Button variant="ghost" onClick={() => void copy()}>{copied ? "Copied" : "Copy details"}</Button></div></div></div>;
}
