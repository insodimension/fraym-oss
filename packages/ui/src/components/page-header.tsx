import type { ReactNode } from "react";
export interface PageHeaderProps { readonly eyebrow?: ReactNode; readonly title: ReactNode; readonly lede?: ReactNode; readonly className?: string; readonly children?: ReactNode }
export function PageHeader({ eyebrow, title, lede, className, children }: PageHeaderProps) { return <header className={className} data-slot="page-header">{eyebrow != null ? <span className="fraym-page-header__eyebrow">{eyebrow}</span> : null}<h1>{title}</h1>{lede != null ? <p>{lede}</p> : null}{children}</header>; }
