import type { ToolCallStatus } from "@fraym/driver";
import type { ReactNode } from "react";
import type { ToolCallState } from "../thread-state";

export type ToolRenderInput = ToolCallState;
export type ToolStatus = ToolCallStatus;
export type ToolKind = string;
export type ToolBodyVariant = "default" | "terminal" | "code" | "diff" | "plain";
export interface ToolView { readonly label?: ReactNode; readonly headIcon?: ReactNode; readonly header?: ReactNode; readonly badges?: ReactNode; readonly stat?: string; readonly status?: ToolStatus; readonly kind?: ToolKind; readonly bodyVariant?: ToolBodyVariant; readonly defaultOpen?: boolean; readonly body: ReactNode }
export type ToolRenderer = (call: ToolRenderInput) => ReactNode | ToolView;
export type ToolRendererMap = Readonly<Record<string, ToolRenderer>>;
