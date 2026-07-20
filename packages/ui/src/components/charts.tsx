// Chart kit — hand-rolled SVG/CSS visualizations, fully token-driven
// (--fr-*), zero dependencies. Sparklines for KPI context, a quadrant
// scatter (quality × latency), ranked horizontal bars, a donut gauge, a
// two-segment split bar, and a swatch legend. Styling lives in charts.css.

import "./charts.css";
import { useId } from "react";
import { cn } from "../lib/cn";

export type ChartTone = "accent" | "add" | "del" | "blue";

const TONE_VAR: Readonly<Record<ChartTone, string>> = {
	accent: "var(--fr-accent)",
	add: "var(--fr-add)",
	del: "var(--fr-del)",
	blue: "var(--fr-blue)",
};

function chartPct(rate: number | undefined): string {
	return rate === undefined ? "—" : `${Math.round(rate * 100)}%`;
}

// ── sparkline (area + line, dash-draw animation) ────────────────────────────

export interface SparklineProps {
	readonly points: readonly number[];
	readonly width?: number;
	readonly height?: number;
	readonly tone?: ChartTone;
	readonly className?: string;
}

export function Sparkline({ points, width = 96, height = 28, tone = "accent", className }: SparklineProps) {
	const gradientId = useId();
	if (points.length < 2) return null;
	const min = Math.min(...points);
	const max = Math.max(...points);
	const span = max - min || 1;
	const stepX = width / (points.length - 1);
	const coords = points.map((value, index) => ({
		x: index * stepX,
		y: height - 2.5 - ((value - min) / span) * (height - 6),
	}));
	const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
	const area = `${line} L${width},${height} L0,${height} Z`;
	const color = TONE_VAR[tone];
	const last = coords[coords.length - 1];
	return (
		<svg
			data-slot="chart-sparkline"
			className={cn("fr-chart-spark", className)}
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			aria-hidden
		>
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={color} stopOpacity={0.28} />
					<stop offset="100%" stopColor={color} stopOpacity={0.02} />
				</linearGradient>
			</defs>
			<path className="fr-chart-spark-fill" d={area} fill={`url(#${gradientId})`} />
			<path
				className="fr-chart-spark-line"
				d={line}
				pathLength={1}
				fill="none"
				stroke={color}
				strokeWidth={1.6}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			{last && <circle className="fr-chart-spark-dot" cx={last.x} cy={last.y} r={2.2} fill={color} />}
		</svg>
	);
}

// ── quadrant scatter ────────────────────────────────────────────────────────

export interface ScatterPoint {
	readonly label: string;
	/** X value in axis units (e.g. seconds of wall clock). */
	readonly x: number;
	/** Y rate 0..1 (rendered as a percentage axis). */
	readonly y: number;
	/** Accent-toned point with a halo (e.g. an on-device model). */
	readonly local?: boolean;
	readonly detail?: string;
}

export interface ScatterChartProps {
	readonly points: readonly ScatterPoint[];
	readonly xLabel?: string;
	readonly yLabel?: string;
	/** Unit suffix on x ticks (default "s"). */
	readonly xUnit?: string;
	/** Corner hint, e.g. "◤ fast & right". Empty string hides it. */
	readonly hint?: string;
	readonly className?: string;
}

const SC_W = 560;
const SC_H = 280;
const SC_M = { top: 18, right: 20, bottom: 36, left: 44 } as const;

export function ScatterChart({
	points,
	xLabel = "x",
	yLabel = "rate",
	xUnit = "s",
	hint = "◤ fast & right",
	className,
}: ScatterChartProps) {
	const innerW = SC_W - SC_M.left - SC_M.right;
	const innerH = SC_H - SC_M.top - SC_M.bottom;
	const xMax = Math.max(...points.map(p => p.x), 1) * 1.18;
	const toX = (v: number) => SC_M.left + (v / xMax) * innerW;
	const toY = (v: number) => SC_M.top + (1 - v) * innerH;
	const yTicks = [0, 0.25, 0.5, 0.75, 1];
	const xTickStep = xMax > 20 ? 10 : xMax > 8 ? 5 : 2;
	const xTicks: number[] = [];
	for (let v = 0; v <= xMax; v += xTickStep) xTicks.push(v);

	return (
		<svg
			data-slot="chart-scatter"
			className={cn("fr-chart-scatter", className)}
			viewBox={`0 0 ${SC_W} ${SC_H}`}
			role="img"
			aria-label={`${yLabel} vs ${xLabel}`}
		>
			{yTicks.map(tick => (
				<g key={`y${tick}`}>
					<line
						x1={SC_M.left}
						x2={SC_W - SC_M.right}
						y1={toY(tick)}
						y2={toY(tick)}
						stroke="var(--fr-border-soft)"
						strokeDasharray={tick === 0 ? undefined : "3 4"}
					/>
					<text x={SC_M.left - 8} y={toY(tick) + 3} textAnchor="end" className="fr-chart-tick">
						{Math.round(tick * 100)}%
					</text>
				</g>
			))}
			{xTicks.map(tick => (
				<text
					key={`x${tick}`}
					x={toX(tick)}
					y={SC_H - SC_M.bottom + 16}
					textAnchor="middle"
					className="fr-chart-tick"
				>
					{tick}
					{xUnit}
				</text>
			))}
			<text x={SC_M.left + innerW / 2} y={SC_H - 6} textAnchor="middle" className="fr-chart-axis">
				{xLabel} →
			</text>
			<text
				x={12}
				y={SC_M.top + innerH / 2}
				textAnchor="middle"
				transform={`rotate(-90 12 ${SC_M.top + innerH / 2})`}
				className="fr-chart-axis"
			>
				{yLabel} →
			</text>
			{hint && (
				<text x={SC_M.left + 8} y={SC_M.top + 12} className="fr-chart-hint">
					{hint}
				</text>
			)}
			{points.map((point, index) => {
				const cx = toX(point.x);
				const cy = toY(point.y);
				const color = point.local ? "var(--fr-accent)" : "var(--fr-blue)";
				return (
					<g key={point.label} className="fr-chart-scatter-pt" style={{ animationDelay: `${120 + index * 90}ms` }}>
						<title>{`${point.label} — ${chartPct(point.y)} · ${point.x.toFixed(1)}${xUnit}${point.detail ? ` · ${point.detail}` : ""}`}</title>
						{point.local && <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.16} />}
						<circle cx={cx} cy={cy} r={4.5} fill={color} stroke="var(--fr-bg)" strokeWidth={1.5} />
						<text x={cx + 9} y={cy + 3.5} className="fr-chart-label">
							{point.label}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

// ── ranked horizontal bars ──────────────────────────────────────────────────

export interface HBarRow {
	readonly label: string;
	/** 0..1 share of the widest bar. */
	readonly ratio: number;
	readonly display: string;
	readonly tone?: ChartTone;
	readonly hint?: string;
}

export interface HBarsProps {
	readonly rows: readonly HBarRow[];
	readonly className?: string;
}

export function HBars({ rows, className }: HBarsProps) {
	return (
		<div data-slot="chart-hbars" className={cn("fr-chart-hbars", className)}>
			{rows.map((row, index) => (
				<div key={row.label} className="fr-chart-hbar-row" title={row.hint}>
					<span className="fr-chart-hbar-label">{row.label}</span>
					<div className="fr-chart-hbar-track">
						<div
							className="fr-chart-hbar-fill"
							data-tone={row.tone ?? "accent"}
							style={{
								width: `${Math.min(Math.max(row.ratio, 0), 1) * 100}%`,
								animationDelay: `${index * 70}ms`,
							}}
						/>
					</div>
					<span className="fr-chart-hbar-value">{row.display}</span>
				</div>
			))}
		</div>
	);
}

// ── donut gauge ─────────────────────────────────────────────────────────────

export interface DonutProps {
	readonly rate: number | undefined;
	readonly caption: string;
	readonly size?: number;
	readonly className?: string;
}

export function Donut({ rate, caption, size = 108, className }: DonutProps) {
	const pct = rate === undefined ? 0 : Math.round(Math.min(Math.max(rate, 0), 1) * 100);
	const stroke = 9;
	const r = (size - stroke) / 2;
	const center = size / 2;
	const tone =
		rate !== undefined && rate >= 0.8
			? "var(--fr-add)"
			: rate !== undefined && rate < 0.5
				? "var(--fr-del)"
				: "var(--fr-warn)";
	return (
		<div data-slot="chart-donut" className={cn("fr-chart-donut", className)} style={{ width: size }}>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
				<circle cx={center} cy={center} r={r} fill="none" stroke="var(--fr-surface-3)" strokeWidth={stroke} />
				<circle
					className="fr-chart-donut-arc"
					cx={center}
					cy={center}
					r={r}
					fill="none"
					stroke={tone}
					strokeWidth={stroke}
					strokeLinecap="round"
					pathLength={100}
					strokeDasharray={`${pct} ${100 - pct}`}
					strokeDashoffset={25}
				/>
			</svg>
			<div className="fr-chart-donut-center">
				<span className="fr-chart-donut-value">{chartPct(rate)}</span>
				<span className="fr-chart-donut-caption">{caption}</span>
			</div>
		</div>
	);
}

// ── two-segment split bar ───────────────────────────────────────────────────

export interface SplitBarProps {
	readonly aShare: number;
	readonly aLabel: string;
	readonly bLabel: string;
	readonly className?: string;
}

export function SplitBar({ aShare, aLabel, bLabel, className }: SplitBarProps) {
	const a = Math.min(Math.max(aShare, 0), 1);
	return (
		<div data-slot="chart-split-bar" className={cn("fr-chart-split", className)}>
			<div className="fr-chart-split-track">
				<div className="fr-chart-split-seg" data-tone="accent" style={{ width: `${a * 100}%` }} />
				<div className="fr-chart-split-seg" data-tone="blue" style={{ width: `${(1 - a) * 100}%` }} />
			</div>
			<ChartLegend
				items={[
					{ tone: "accent", label: `${aLabel} ${chartPct(a)}` },
					{ tone: "blue", label: `${bLabel} ${chartPct(1 - a)}` },
				]}
			/>
		</div>
	);
}

// ── swatch legend ───────────────────────────────────────────────────────────

export interface ChartLegendItem {
	readonly tone: ChartTone;
	readonly label: string;
}

export interface ChartLegendProps {
	readonly items: readonly ChartLegendItem[];
	readonly className?: string;
}

export function ChartLegend({ items, className }: ChartLegendProps) {
	return (
		<div data-slot="chart-legend" className={cn("fr-chart-legend", className)}>
			{items.map(item => (
				<span key={item.label}>
					<i className="fr-chart-swatch" data-tone={item.tone} /> {item.label}
				</span>
			))}
		</div>
	);
}
