import { elementEntries } from "./elements";
import { featureEntries } from "./features";
import { tokenEntries } from "./tokens";
import { toolEntries } from "./tools";
import type { Entry } from "../entry";

export const entries: readonly Entry[] = [
  ...tokenEntries,
  ...elementEntries,
  ...toolEntries,
  ...featureEntries,
];
