import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "../elements/Badge";
const tones = { mute: "neutral", accent: "accent", warn: "warning", add: "success", del: "danger", blue: "blue" } as const satisfies Record<string, BadgeTone>;
export function headBadge(text: string, tone: keyof typeof tones = "mute"): ReactNode { return <Badge tone={tones[tone]}>{text}</Badge>; }
