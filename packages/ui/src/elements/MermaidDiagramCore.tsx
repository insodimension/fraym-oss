import { type PointerEvent as ReactPointerEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { classNames } from "./utils";

interface MermaidApi { initialize(config: Record<string, unknown>): void; render(id: string, source: string): Promise<{ svg: string }> }
let mermaidPromise: Promise<MermaidApi> | null = null;
function loadMermaid() { mermaidPromise ??= import("mermaid").then(module => module.default as MermaidApi); return mermaidPromise; }

function resolvedColor(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}
function themeVariables() {
  return {
    darkMode: document.documentElement.getAttribute("data-theme") !== "light",
    background: "transparent", fontFamily: "inherit", fontSize: "14px",
    primaryColor: resolvedColor("--fraym-color-surface-2", "#19191d"),
    secondaryColor: resolvedColor("--fraym-color-surface-3", "#222228"),
    tertiaryColor: resolvedColor("--fraym-color-surface", "#111114"),
    primaryBorderColor: resolvedColor("--fraym-color-border", "#3a3a44"),
    nodeBorder: resolvedColor("--fraym-color-border", "#3a3a44"),
    primaryTextColor: resolvedColor("--fraym-color-text", "#f4f4f5"),
    textColor: resolvedColor("--fraym-color-text", "#f4f4f5"),
    lineColor: resolvedColor("--fraym-color-text-3", "#8a8a94"),
    edgeLabelBackground: resolvedColor("--fraym-color-surface", "#111114"),
    clusterBkg: resolvedColor("--fraym-color-surface-2", "#19191d"),
    clusterBorder: resolvedColor("--fraym-color-border-soft", "#2b2b33"),
  };
}

export interface MermaidDiagramProps { readonly code: string; readonly className?: string }
export function MermaidDiagram({ code, className }: MermaidDiagramProps) {
  const [result, setResult] = useState<{ source: string; svg?: string; error?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const id = `fraym-mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  useEffect(() => {
    let active = true;
    void loadMermaid().then(async mermaid => {
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "base", themeVariables: themeVariables(), flowchart: { useMaxWidth: false, htmlLabels: true } });
      return mermaid.render(id, code);
    }).then(({ svg }) => { if (active) setResult({ source: code, svg }); }).catch(error => { if (active) setResult({ source: code, error: error instanceof Error ? error.message : String(error) }); });
    return () => { active = false; };
  }, [code, id]);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.isComposing) setOpen(false); }; addEventListener("keydown", close); return () => removeEventListener("keydown", close); }, [open]);
  const current = result?.source === code ? result : null;
  if (current?.error) return <div className={classNames("fraym-mermaid fraym-mermaid--error", className)} data-slot="mermaid-diagram"><strong>Diagram render failed: {current.error}</strong><pre>{code}</pre></div>;
  if (!current?.svg) return <div aria-label="Rendering diagram…" className={classNames("fraym-mermaid fraym-mermaid--loading", className)} data-slot="mermaid-diagram" />;
  const panStart = (event: ReactPointerEvent<HTMLDivElement>) => { const element = scrollRef.current; if (!element) return; dragRef.current = { x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop }; element.setPointerCapture(event.pointerId); };
  const panMove = (event: ReactPointerEvent<HTMLDivElement>) => { const element = scrollRef.current; const drag = dragRef.current; if (!element || !drag) return; element.scrollLeft = drag.left - event.clientX + drag.x; element.scrollTop = drag.top - event.clientY + drag.y; };
  const svgMarkup = { __html: current.svg };
  return <><div className={classNames("fraym-mermaid", className)} data-slot="mermaid-diagram"><button className="fraym-mermaid__expand" onClick={() => setOpen(true)} type="button"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" /></svg>Expand</button><div className="fraym-mermaid__diagram" dangerouslySetInnerHTML={svgMarkup} /></div>{open && typeof document !== "undefined" ? createPortal(<div className="fraym-mermaid__lightbox" data-slot="mermaid-lightbox" onClick={() => setOpen(false)}><button aria-label="Close" className="fraym-mermaid__close" onClick={() => setOpen(false)} type="button">×</button><div className="fraym-mermaid__pan" dangerouslySetInnerHTML={{ __html: current.svg.replaceAll(id, `${id}-expanded`) }} onClick={event => event.stopPropagation()} onPointerCancel={() => { dragRef.current = null; }} onPointerDown={panStart} onPointerMove={panMove} onPointerUp={() => { dragRef.current = null; }} ref={scrollRef} /></div>, document.body) : null}</>;
}
