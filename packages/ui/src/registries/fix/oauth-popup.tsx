import { useState } from "react";
import { Button } from "../../elements/Button";
import { Input } from "../../elements/Input";
import { Spinner } from "../../elements/Spinner";
export type OAuthStatus = "idle" | "starting" | "awaiting-auth" | "awaiting-input" | "connecting" | "success" | "cancelled" | "error";
export interface OAuthController { readonly status: OAuthStatus; readonly error?: string | null; readonly progress?: string; readonly authInfo?: { readonly url?: string }; readonly prompt?: { readonly message?: string; readonly placeholder?: string; readonly allowEmpty?: boolean }; submitInput(value: string): void }
export interface OAuthPopupProps { readonly provider: string; readonly oauth: OAuthController }
export function OAuthPopup({ provider, oauth }: OAuthPopupProps) {
  const [manual, setManual] = useState(false); const [code, setCode] = useState(""); const [copied, setCopied] = useState(false);
  if (oauth.status === "error") return <div className="fraym-fix-error" data-slot="plugin-oauth-error">{oauth.error ?? "Connection failed."}</div>;
  if (["idle", "success", "cancelled"].includes(oauth.status)) return null;
  const url = oauth.authInfo?.url; const awaitingCode = oauth.status === "awaiting-input" && oauth.prompt;
  const phase = oauth.status === "starting" ? "Opening your browser…" : oauth.status === "connecting" ? oauth.progress ?? "Finishing up…" : url ? `Waiting for approval in ${provider}…` : `Connecting to ${provider}…`;
  const copy = async () => { if (!url || !navigator.clipboard) return; await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return <div className="fraym-fix-oauth" data-slot="plugin-oauth-connect-flow"><div><Spinner label={phase} size="sm" /><strong>{phase}</strong></div>{url ? <div><Button asChild size="sm" variant="outline"><a data-slot="plugin-oauth-open" href={url} rel="noopener noreferrer" target="_blank">Open browser again</a></Button><Button onClick={() => void copy()} size="sm" variant="ghost">{copied ? "Copied" : "Copy link"}</Button></div> : null}{awaitingCode ? manual ? <div className="fraym-fix-oauth__manual" data-slot="plugin-oauth-input"><small>{oauth.prompt?.message}</small><Input aria-label={oauth.prompt?.message ?? "Authorization code"} autoFocus placeholder={oauth.prompt?.placeholder ?? "Paste code"} value={code} onChange={event => setCode(event.currentTarget.value)} /><Button disabled={!oauth.prompt?.allowEmpty && !code.trim()} onClick={() => oauth.submitInput(code.trim())} size="sm">Continue</Button></div> : <button className="fraym-fix-oauth__toggle" data-slot="plugin-oauth-manual-toggle" onClick={() => setManual(true)} type="button">Enter the code manually</button> : null}</div>;
}
