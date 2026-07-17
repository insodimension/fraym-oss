import type { AethrState } from "./states";
export interface WizardChoice {
  readonly id: string;
  readonly label: string;
  readonly variant?: "primary" | "ghost";
  readonly hint?: string;
  readonly action?: string;
  readonly requiresCapability?: string;
  readonly next?: string;
}
export interface WizardInput {
  readonly id: string;
  readonly placeholder?: string;
  readonly initialValue?: string;
}
export interface WizardChip {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly badge?: string;
}
export interface WizardScene {
  readonly id: string;
  readonly caption?: string;
  readonly line: string;
  readonly state?: AethrState;
  readonly growth?: number;
  readonly recede?: number;
  readonly autoAdvanceMs?: number;
  readonly onEnter?: string;
  readonly choices?: readonly WizardChoice[];
  readonly input?: WizardInput;
  readonly chips?: readonly WizardChip[];
  readonly chipsKey?: string;
  readonly chipsMin?: number;
  readonly next?: string;
}
export interface WizardSpec {
  readonly id: string;
  readonly scenes: readonly WizardScene[];
  readonly onComplete?: string;
}
export interface WizardActionEvent {
  readonly wizardId: string;
  readonly sceneId: string;
  readonly action: string;
  readonly choiceId?: string;
  readonly values: Readonly<Record<string, string>>;
}
