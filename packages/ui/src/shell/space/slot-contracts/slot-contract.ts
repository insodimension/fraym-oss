/** The closed, platform-owned set of shell slot contracts a space's layout
 *  exposes (NOMENCLATURE § Spaces And Rooms — "slot contract"). An
 *  implementation fills exactly ONE; the set never grows from a plugin (grid
 *  law). `workspace-surface` is the pane's inner region, guarded by its own
 *  crash boundary alongside the three top-level slots. */
export type SlotContract = "rail" | "dock" | "workspace" | "workspace-surface";
