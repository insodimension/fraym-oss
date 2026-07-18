import type { ReactNode } from "react";
import type { ToolBodyVariant, ToolKind, ToolStatus } from "../features/tool-card/tool-card";
import type { ActiveToolCall } from "../hooks/session-types";

export type ToolRenderInput = ActiveToolCall;
export type { ToolBodyVariant, ToolKind, ToolStatus };
export interface ToolView { readonly label?: ReactNode | undefined; readonly headIcon?: ReactNode | undefined; readonly header?: ReactNode | undefined; readonly badges?: ReactNode | undefined; readonly stat?: string | undefined; readonly status?: ToolStatus | undefined; readonly kind?: ToolKind | undefined; readonly bodyVariant?: ToolBodyVariant | undefined; readonly defaultOpen?: boolean | undefined; readonly body: ReactNode }
export type ToolRenderer = (call: ToolRenderInput) => ReactNode | ToolView;
export type ToolRendererMap = Readonly<Record<string, ToolRenderer>>;
