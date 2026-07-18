import type { ReactNode } from "react";

export interface PageHeaderProps {
	readonly eyebrow?: ReactNode;
	readonly title: ReactNode;
	readonly lede?: ReactNode;
	readonly className?: string;
	readonly children?: ReactNode;
}

/** Doc/section header: monospace eyebrow, display title, lede paragraph. */
export function PageHeader({ eyebrow, title, lede, className, children }: PageHeaderProps) {
	return (
		<header data-slot="page-header" className={className}>
			{eyebrow != null && (
				<span className="font-secondary text-[11px] font-medium uppercase tracking-[0.16em] text-fr-accent">
					{eyebrow}
				</span>
			)}
			<h1 className="mt-2 mb-[0.8rem] font-display text-[38px] font-semibold leading-[1.05] tracking-[-0.03em] text-fr-text max-[760px]:text-[30px]">
				{title}
			</h1>
			{lede != null && (
				<p className="max-w-[50em] text-[17px] leading-[1.55] text-fr-text-2 max-[760px]:text-[15px] [&_b]:font-semibold [&_b]:text-fr-text">
					{lede}
				</p>
			)}
			{children}
		</header>
	);
}
