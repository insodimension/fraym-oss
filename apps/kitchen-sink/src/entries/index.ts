import { elementEntries } from "./elements";
import { composerEntries } from "./composer";
import { featureEntries } from "./features";
import { tokenEntries } from "./tokens";
import { toolEntries } from "./tools";
import type { Entry } from "../entry";
import { chatSurfaceEntries } from "./chat-surface";
import { packageEntries } from "./packages";

export const entries: readonly Entry[] = [
  ...tokenEntries,
  ...elementEntries,
  ...toolEntries,
  ...composerEntries,
  ...featureEntries,
  ...chatSurfaceEntries,
  ...packageEntries,
];
