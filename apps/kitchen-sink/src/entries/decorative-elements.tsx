import { useState } from "react";
import {
  ChromaGrid, ClickSpark, CompactionSplit, DiagramTag, DotGridBackdrop, ElectricBorder,
  GlareHover, GradientText, GradualBlur, LiquidGlassBackdrop, LiquidGlassButton,
  LiquidGlassSurface, Magnet, MermaidDiagram, NoiseOverlay, SessionContinuationSplit,
  SessionLink, SessionNavigationProvider, ShinyText, StarBorder,
} from "@fraym/ui";
import { elementEntry, type Entry } from "../entry";

const tiles = <div className="sink-effect-grid">{["Plan", "Build", "Verify", "Ship"].map(item => <div key={item}>{item}</div>)}</div>;
function ChromaGridDemo() { return <ChromaGrid className="sink-effect-stage">{tiles}</ChromaGrid>; }
function ClickSparkDemo() { const [clicks, setClicks] = useState(0); return <ClickSpark className="sink-effect-stage"><button className="sink-effect-target" onClick={() => setClicks(value => value + 1)} type="button">Click for sparks · {clicks}</button></ClickSpark>; }
function ElectricBorderDemo() { return <ElectricBorder className="sink-effect-frame"><div className="sink-effect-card">Streaming connection stable</div></ElectricBorder>; }
function GlareHoverDemo() { return <GlareHover className="sink-effect-card">Hover to inspect the surface</GlareHover>; }
function GradientTextDemo() { return <GradientText showBorder>Agent workspace ready</GradientText>; }
function GradualBlurDemo() { return <div className="sink-blur-stage"><div>Resolved events<br />Tool output<br />Assistant response<br />Token usage<br />Session complete</div><GradualBlur /></div>; }
function MagnetDemo() { return <div className="sink-effect-stage"><Magnet><button className="sink-effect-target" type="button">Move nearby</button></Magnet></div>; }
function NoiseOverlayDemo() { return <div className="sink-noise-stage"><NoiseOverlay /><strong>Procedural texture</strong></div>; }
function ShinyTextDemo() { return <ShinyText>Indexing repository…</ShinyText>; }
function StarBorderDemo() { return <StarBorder><div className="sink-effect-card">Generate response</div></StarBorder>; }
function DotGridDemo() { return <DotGridBackdrop className="sink-dot-stage"><strong>Architecture canvas</strong><span>Composable agent primitives</span></DotGridBackdrop>; }

function GlassBackdropDemo() { return <div className="sink-glass-stage"><LiquidGlassBackdrop contained><div className="sink-glass-layout"><strong>Ambient field</strong><span>Shared by every lens in this scope.</span></div></LiquidGlassBackdrop></div>; }
function GlassSurfaceDemo() { return <div className="sink-glass-stage"><LiquidGlassBackdrop contained><div className="sink-glass-layout"><LiquidGlassSurface className="sink-glass-card" variant="frosted">Refractive surface</LiquidGlassSurface></div></LiquidGlassBackdrop></div>; }
function GlassButtonDemo() { const [count, setCount] = useState(0); return <div className="sink-glass-stage"><LiquidGlassBackdrop contained><div className="sink-glass-layout"><LiquidGlassButton onClick={() => setCount(value => value + 1)}>Run agent · {count}</LiquidGlassButton></div></LiquidGlassBackdrop></div>; }

function MermaidDemo() { return <MermaidDiagram code={"flowchart LR\n  Prompt --> Driver\n  Driver --> UI\n  UI --> Result"} />; }
function DiagramTagDemo() { return <div><DiagramTag tone="accent">EVENTS ↓</DiagramTag><strong>Driver pipeline</strong></div>; }
function CompactionDemo() { return <div className="sink-demo-stack"><CompactionSplit /><CompactionSplit summary="Tool results and decisions retained." tokens={18420} variant="done" /></div>; }
function ContinuationDemo() { const [opened, setOpened] = useState("None"); return <SessionNavigationProvider openSession={({ sessionId }) => setOpened(sessionId)}><div className="sink-demo-stack"><SessionContinuationSplit reason="handoff" toSessionId="next-session" workspaceId="demo" /><span className="sink-demo-feedback">Opened: {opened}</span></div></SessionNavigationProvider>; }
function SessionLinkDemo() { const [opened, setOpened] = useState("None"); return <SessionNavigationProvider openSession={({ sessionId }) => setOpened(sessionId)}><div className="sink-demo-row"><SessionLink label="Open follow-up" sessionId="follow-up" workspaceId="demo" /><span className="sink-demo-feedback">Opened: {opened}</span></div></SessionNavigationProvider>; }

const entry = elementEntry((title) => `Compose ${title} inside an agent surface.`);

export const decorativeElementEntries: readonly Entry[] = [
  entry("chroma-grid", "ChromaGrid", "layout", "Pointer-follow focus that desaturates the surrounding grid.", ChromaGridDemo, `<ChromaGrid>{cards}</ChromaGrid>`),
  entry("click-spark", "ClickSpark", "feedback", "Canvas sparks emitted from pointer activation without blocking content.", ClickSparkDemo, `<ClickSpark><Button>Run</Button></ClickSpark>`),
  entry("electric-border", "ElectricBorder", "feedback", "Turbulence-displaced border with layered electric bloom.", ElectricBorderDemo, `<ElectricBorder>Connected</ElectricBorder>`),
  entry("glare-hover", "GlareHover", "feedback", "A configurable light band that sweeps across hovered content.", GlareHoverDemo, `<GlareHover>Inspect surface</GlareHover>`),
  entry("gradient-text", "GradientText", "content", "Animated multicolor label with an optional matching rim.", GradientTextDemo, `<GradientText showBorder>Workspace ready</GradientText>`),
  entry("gradual-blur", "GradualBlur", "layout", "Layered directional backdrop blur for scroll and viewport edges.", GradualBlurDemo, `<GradualBlur position="bottom" />`),
  entry("magnet", "Magnet", "actions", "Pointer-proximity attraction for bounded interactive targets.", MagnetDemo, `<Magnet><Button>Move nearby</Button></Magnet>`),
  entry("noise-overlay", "NoiseOverlay", "feedback", "Low-cost canvas grain with configurable refresh cadence.", NoiseOverlayDemo, `<NoiseOverlay alpha={15} />`),
  entry("shiny-text", "ShinyText", "feedback", "Directional sheen for short progress and status copy.", ShinyTextDemo, `<ShinyText>Indexing…</ShinyText>`),
  entry("star-border", "StarBorder", "actions", "Orbiting radial highlights around an action surface.", StarBorderDemo, `<StarBorder><Button>Generate</Button></StarBorder>`),
  entry("dot-grid-backdrop", "DotGridBackdrop", "layout", "Subtle dotted field and optional accent glow behind content.", DotGridDemo, `<DotGridBackdrop glow>{content}</DotGridBackdrop>`),
  entry("liquid-glass-backdrop", "LiquidGlassBackdrop", "layout", "Procedural ambient field shared with refractive descendants.", GlassBackdropDemo, `<LiquidGlassBackdrop contained>{content}</LiquidGlassBackdrop>`),
  entry("liquid-glass-surface", "LiquidGlassSurface", "layout", "WebGL lens that refracts its nearest ambient field.", GlassSurfaceDemo, `<LiquidGlassSurface variant="frosted">Content</LiquidGlassSurface>`),
  entry("liquid-glass-button", "LiquidGlassButton", "actions", "Pressable polished lens with a translucent fallback.", GlassButtonDemo, `<LiquidGlassButton>Run agent</LiquidGlassButton>`),
  entry("mermaid-diagram", "MermaidDiagram", "content", "Theme-aware diagrams with an expandable panning lightbox.", MermaidDemo, `<MermaidDiagram code={diagramSource} />`),
  entry("diagram-tag", "DiagramTag", "content", "Small tonal kicker for diagram headings and architecture labels.", DiagramTagDemo, `<DiagramTag tone="accent">EVENTS ↓</DiagramTag>`),
  entry("compaction-split", "CompactionSplit", "feedback", "In-progress and completed context-compaction divider states.", CompactionDemo, `<CompactionSplit variant="done" tokens={18420} summary="Decisions retained." />`),
  entry("session-continuation-split", "SessionContinuationSplit", "feedback", "Semantic branch divider with host-provided session navigation.", ContinuationDemo, `<SessionContinuationSplit workspaceId="workspace" toSessionId="next" reason="handoff" />`),
  entry("session-link", "SessionLink", "actions", "Inline session chip that degrades to text without a navigation host.", SessionLinkDemo, `<SessionLink workspaceId="workspace" sessionId="follow-up" />`),
];
