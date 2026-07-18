import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "../elements/badge";
type BadgeTone = NonNullable<BadgeProps["tone"]>;
const tones = { mute: "mute", accent: "accent", warn: "warn", add: "add", del: "del", blue: "blue" } as const satisfies Record<string, BadgeTone>;
export function headBadge(text: string, tone: keyof typeof tones = "mute"): ReactNode { return <Badge tone={tones[tone]}>{text}</Badge>; }
