import { elementEntries } from "./elements";
import { featureEntries } from "./features";
import { tokenEntries } from "./tokens";
import type { Entry } from "../entry";

export const entries: readonly Entry[] = [
  ...tokenEntries,
  ...elementEntries,
  ...featureEntries,
];
