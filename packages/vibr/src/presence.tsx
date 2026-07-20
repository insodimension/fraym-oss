import type { AvatarId, AvatarProps } from "./types";
import { AVATARS } from "./avatars";
export interface PresenceProps extends AvatarProps {
  readonly avatar?: AvatarId;
}
export function Presence({ avatar = "nebula", ...props }: PresenceProps) {
  if (avatar === "none") return null;
  const Component = AVATARS[avatar];
  return Component ? <Component {...props} /> : null;
}
