import { CodeBlock } from "@fraym-ai/ui";
import { cn, Icon } from "../compat/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EntryDocs } from "./docs";

type DocSectionId = "import" | "anatomy" | "examples" | "api";

interface DocSectionLink {
	readonly id: DocSectionId;
	readonly label: string;
	readonly count?: number;
}

function sectionDomId(id: DocSectionId): string {
	return `docs-${id}`;
}

function useDocScrollSpy(items: readonly DocSectionLink[]): DocSectionId | null {
	const [active, setActive] = useState<DocSectionId | null>(items[0]?.id ?? null);

	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => {
				const hit = entries.find(entry => entry.isIntersecting);
				if (hit) setActive(hit.target.id.replace("docs-", "") as DocSectionId);
			},
			{ rootMargin: "-10% 0px -72% 0px" },
		);
		for (const item of items) {
			const el = document.getElementById(sectionDomId(item.id));
			if (el) observer.observe(el);
		}
		return () => observer.disconnect();
	}, [items]);

	return active;
}

function DocNav({ items }: { readonly items: readonly DocSectionLink[] }) {
	const active = useDocScrollSpy(items);
	return (
		<nav aria-label="Documentation sections" className="hidden w-44 shrink-0 self-start lg:block">
			<div className="sticky top-3 rounded-lg border border-fr-border-soft bg-fr-surface p-3">
				<div className="mb-2 fr-eyebrow">Docs</div>
				<div className="space-y-0.5">
					{items.map(item => (
						<button
							key={item.id}
							type="button"
							onClick={() => document.getElementById(sectionDomId(item.id))?.scrollIntoView({ block: "start" })}
							className={cn(
								"flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-fr-xs transition-colors",
								active === item.id
									? "bg-fr-accent-dim text-fr-accent"
									: "text-fr-text-3 hover:bg-fr-surface-2 hover:text-fr-text-2",
							)}
						>
							<span>{item.label}</span>
							{typeof item.count === "number" && item.count > 0 && (
								<span className="font-secondary text-fr-2xs text-fr-text-3">{item.count}</span>
							)}
						</button>
					))}
				</div>
			</div>
		</nav>
	);
}

function PropTable({ props }: { readonly props: readonly EntryDocs["api"][number][] }) {
	return (
		<div className="overflow-hidden rounded-lg border border-fr-border-soft bg-fr-surface">
			<div className="overflow-x-auto">
				<table className="w-full min-w-[680px] text-left text-fr-sm">
					<thead>
						<tr className="border-b border-fr-border-soft bg-fr-surface-2/60">
							<th className="px-4 py-3 font-medium text-fr-text">Prop</th>
							<th className="px-4 py-3 font-medium text-fr-text">Type</th>
							<th className="px-4 py-3 font-medium text-fr-text">Default</th>
							<th className="px-4 py-3 font-medium text-fr-text">Description</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-fr-border-soft/60">
						{props.map(prop => (
							<tr key={prop.name} className="align-top transition-colors hover:bg-fr-surface-2/40">
								<td className="px-4 py-3">
									<div className="flex flex-wrap items-center gap-1.5">
										<code className="rounded bg-fr-accent-dim px-1.5 py-0.5 font-secondary text-fr-xs text-fr-accent">
											{prop.name}
										</code>
										{prop.required && (
											<span className="rounded-sm border border-fr-accent-line px-1 py-px font-secondary text-fr-2xs text-fr-accent">
												required
											</span>
										)}
									</div>
								</td>
								<td className="max-w-[260px] px-4 py-3 font-secondary text-fr-xs text-fr-text-2">
									<code className="whitespace-pre-wrap break-words">{prop.type}</code>
								</td>
								<td className="px-4 py-3 font-secondary text-fr-xs text-fr-text-3">
									{prop.default ? <code>{prop.default}</code> : <span aria-label="No default">—</span>}
								</td>
								<td className="px-4 py-3 leading-relaxed text-fr-text-2">{prop.description}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function toMarkdown(docs: EntryDocs): string {
	const lines: string[] = [];
	lines.push("## Import");
	lines.push("");
	lines.push("```tsx");
	lines.push(docs.import);
	lines.push("```");
	lines.push("");
	lines.push("## Anatomy");
	lines.push("");
	lines.push("```tsx");
	lines.push(docs.anatomy);
	lines.push("```");
	lines.push("");
	if (docs.examples.length) {
		lines.push("## Examples");
		lines.push("");
		for (const ex of docs.examples) {
			lines.push(`### ${ex.label}`);
			lines.push("");
			lines.push("```tsx");
			lines.push(ex.code);
			lines.push("```");
			lines.push("");
		}
	}
	if (docs.api.length) {
		lines.push("## API Reference");
		lines.push("");
		lines.push("| Prop | Type | Default | Description |");
		lines.push("|------|------|---------|-------------|");
		for (const prop of docs.api) {
			const def = prop.default ?? "—";
			lines.push(`| \`${prop.name}\` | \`${prop.type}\` | \`${def}\` | ${prop.description} |`);
		}
		lines.push("");
	}
	return lines.join("\n");
}

function DocSection({
	id,
	title,
	description,
	children,
}: {
	readonly id: DocSectionId;
	readonly title: string;
	readonly description: string;
	readonly children: React.ReactNode;
}) {
	return (
		<section
			id={sectionDomId(id)}
			className="scroll-mt-4 rounded-xl border border-fr-border-soft bg-fr-surface/70 p-4 sm:p-5"
		>
			<div className="mb-4 flex items-start gap-3">
				<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-fr-border-soft bg-fr-surface-2 text-fr-text-3">
					<Icon name="file" size={14} />
				</div>
				<div>
					<h3 className="text-fr-base font-semibold text-fr-text">{title}</h3>
					<p className="mt-1 text-fr-sm leading-relaxed text-fr-text-2">{description}</p>
				</div>
			</div>
			{children}
		</section>
	);
}

function DocPanelHeader({
	copied,
	copyFailed,
	onCopy,
}: {
	readonly copied: boolean;
	readonly copyFailed: boolean;
	readonly onCopy: () => void;
}) {
	const state = copyButtonState(copied, copyFailed);
	return (
		<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
			<div>
				<span className="fr-eyebrow">Documentation</span>
				<p className="mt-1 text-fr-sm text-fr-text-2">Copyable usage notes, live examples, and prop contracts.</p>
			</div>
			<button
				type="button"
				onClick={onCopy}
				className={cn(
					"inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-fr-sm transition-colors",
					state.className,
				)}
			>
				<Icon name={state.icon} size={14} />
				{state.label}
			</button>
		</div>
	);
}

function copyButtonState(
	copied: boolean,
	copyFailed: boolean,
): {
	readonly icon: "check" | "x" | "copy";
	readonly label: string;
	readonly className: string;
} {
	if (copied) return { icon: "check", label: "Copied", className: "border-fr-add/40 bg-fr-add-bg text-fr-add" };
	if (copyFailed) return { icon: "x", label: "Copy failed", className: "border-fr-del/40 bg-fr-del-bg text-fr-del" };
	return {
		icon: "copy",
		label: "Copy as Markdown",
		className: "border-fr-border-soft bg-fr-surface text-fr-text-2 hover:bg-fr-surface-2 hover:text-fr-text",
	};
}

function DocExamplesSection({ examples }: { readonly examples: EntryDocs["examples"] }) {
	return examples.length > 0 ? (
		<DocSection id="examples" title="Examples" description="Copy-pasteable patterns and variant combinations.">
			<div className="flex flex-col gap-5">
				{examples.map((example, i) => (
					<div key={`${example.label}-${example.code}`} className="rounded-lg border border-fr-border-soft bg-fr-bg p-3">
						<div className="mb-3 flex items-center justify-between gap-3">
							<span className="fr-eyebrow">{example.label}</span>
							<span className="font-secondary text-fr-2xs text-fr-text-3">example {i + 1}</span>
						</div>
						<div className="grid gap-3">
							<CodeBlock code={example.code} language="tsx" lineNumbers />
							{example.preview && (
								<div className="rounded-lg border border-fr-border-soft bg-fr-surface px-4 py-3">
									{example.preview}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</DocSection>
	) : null;
}

function DocApiSection({ api }: { readonly api: EntryDocs["api"] }) {
	return api.length > 0 ? (
		<DocSection id="api" title="API Reference" description="All documented props accepted by this entry.">
			<PropTable props={api} />
		</DocSection>
	) : null;
}

function DocPanelSections({ docs }: { readonly docs: EntryDocs }) {
	return (
		<div className="flex flex-col gap-4">
			<DocSection id="import" title="Import" description="The smallest supported import path for this entry.">
				<CodeBlock code={docs.import} language="tsx" lineNumbers />
			</DocSection>
			<DocSection
				id="anatomy"
				title="Anatomy"
				description="The default composition and the names you wire together."
			>
				<CodeBlock code={docs.anatomy} language="tsx" lineNumbers />
			</DocSection>
			<DocExamplesSection examples={docs.examples} />
			<DocApiSection api={docs.api} />
		</div>
	);
}

export function DocPanel({ docs }: { readonly docs: EntryDocs }) {
	const [copied, setCopied] = useState(false);
	const [copyFailed, setCopyFailed] = useState(false);
	const resetTimers = useRef(new Set<number>());
	useEffect(() => () => {
		for (const timer of resetTimers.current) window.clearTimeout(timer);
	}, []);
	const scheduleReset = useCallback((reset: () => void, delay: number) => {
		const timer = window.setTimeout(() => {
			resetTimers.current.delete(timer);
			reset();
		}, delay);
		resetTimers.current.add(timer);
	}, []);
	const navItems = useMemo<readonly DocSectionLink[]>(() => {
		const items: DocSectionLink[] = [
			{ id: "import", label: "Import" },
			{ id: "anatomy", label: "Anatomy" },
		];
		if (docs.examples.length) items.push({ id: "examples", label: "Examples", count: docs.examples.length });
		if (docs.api.length) items.push({ id: "api", label: "API", count: docs.api.length });
		return items;
	}, [docs.api.length, docs.examples.length]);

	const handleCopy = useCallback(() => {
		navigator.clipboard
			.writeText(toMarkdown(docs))
			.then(() => {
				setCopyFailed(false);
				setCopied(true);
				scheduleReset(() => setCopied(false), 2000);
			})
			.catch(() => {
				setCopied(false);
				setCopyFailed(true);
				scheduleReset(() => setCopyFailed(false), 2500);
			});
	}, [docs, scheduleReset]);

	return (
		<div className="flex gap-8">
			<div className="min-w-0 flex-1">
				<DocPanelHeader copied={copied} copyFailed={copyFailed} onCopy={handleCopy} />
				<DocPanelSections docs={docs} />
			</div>
			<DocNav items={navItems} />
		</div>
	);
}
