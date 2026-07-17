import { createContext, type HTMLAttributes, type ButtonHTMLAttributes, useContext, useState } from "react";

import { classNames } from "./utils";

export type TabsVariant = "segmented" | "dock";

interface TabsContextValue {
  value: string;
  variant: TabsVariant;
  select: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
}

export function Tabs({ value, defaultValue = "", onValueChange, variant = "segmented", className, ...props }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const selected = value ?? internal;
  const select = (next: string) => { if (value === undefined) setInternal(next); onValueChange?.(next); };
  return <TabsContext.Provider value={{ value: selected, variant, select }}><div {...props} className={classNames("fraym-tabs", `fraym-tabs--${variant}`, className)} data-slot="tabs" /></TabsContext.Provider>;
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classNames("fraym-tabs__list", className)} data-slot="tabs-list" role="tablist" />;
}

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> { value: string }

export function TabsTrigger({ value, className, disabled, onClick, ...props }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  const active = context?.value === value;
  return <button {...props} aria-selected={active} className={classNames("fraym-tabs__trigger", active && "is-active", className)} data-slot="tabs-trigger" disabled={disabled} role="tab" type="button" onClick={(event) => { onClick?.(event); if (!event.defaultPrevented && !disabled) context?.select(value); }} />;
}

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> { value: string }

export function TabsContent({ value, className, ...props }: TabsContentProps) {
  const context = useContext(TabsContext);
  const active = context?.value === value;
  return <div {...props} className={classNames("fraym-tabs__content", className)} data-slot="tabs-content" hidden={!active} role="tabpanel" />;
}
