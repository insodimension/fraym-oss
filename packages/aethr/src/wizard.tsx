import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import { Aethr } from "./aethr";
import { CinematicText } from "./cinematic-text";
import type {
  WizardActionEvent,
  WizardChoice,
  WizardSpec,
} from "./wizard-types";
import "./wizard.css";
const NO_CAPABILITIES: readonly string[] = [];
export interface CinematicWizardProps {
  readonly spec: WizardSpec;
  readonly capabilities?: readonly string[];
  readonly onAction?: (event: WizardActionEvent) => void | Promise<void>;
  readonly onComplete?: (values: Readonly<Record<string, string>>) => void;
  readonly fpsCap?: number;
  readonly backdrop?: ReactNode;
  readonly className?: string;
}
export function CinematicWizard({
  spec,
  capabilities = NO_CAPABILITIES,
  onAction,
  onComplete,
  fpsCap,
  backdrop,
  className,
}: CinematicWizardProps) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
  const scene = spec.scenes[index];
  const capabilitySet = useMemo(() => new Set(capabilities), [capabilities]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const choices = useMemo(
    () =>
      scene?.choices?.filter(
        (choice) =>
          !choice.requiresCapability ||
          capabilitySet.has(choice.requiresCapability),
      ) ?? [],
    [scene, capabilitySet],
  );
  const complete = () => {
    if (spec.onComplete)
      void onAction?.({
        wizardId: spec.id,
        sceneId: scene?.id ?? "complete",
        action: spec.onComplete,
        values,
      });
    onComplete?.(values);
  };
  const advance = (target?: string) => {
    const next = target
      ? spec.scenes.findIndex((item) => item.id === target)
      : index + 1;
    if (next < 0 || next >= spec.scenes.length) complete();
    else {
      setIndex(next);
      setSelected([]);
    }
  };
  const choose = async (choice: WizardChoice) => {
    if (!scene || busy) return;
    setBusy(true);
    const nextValues = {
      ...values,
      [`${scene.id}.choice`]: choice.id,
      ...(scene.chipsKey ? { [scene.chipsKey]: JSON.stringify(selected) } : {}),
    };
    setValues(nextValues);
    if (choice.action)
      await onAction?.({
        wizardId: spec.id,
        sceneId: scene.id,
        action: choice.action,
        choiceId: choice.id,
        values: nextValues,
      });
    setBusy(false);
    advance(choice.next ?? scene.next);
  };
  const enterScene = useEffectEvent((current: NonNullable<typeof scene>) => {
    if (current.onEnter)
      void onAction?.({
        wizardId: spec.id,
        sceneId: current.id,
        action: current.onEnter,
        values,
      });
    return current.autoAdvanceMs === undefined
      ? undefined
      : window.setTimeout(() => advance(current.next), current.autoAdvanceMs);
  });
  useEffect(() => {
    if (!scene) return;
    const timer = enterScene(scene);
    return timer === undefined ? undefined : () => clearTimeout(timer);
  }, [scene]);
  if (!scene) return null;
  const gated = Boolean(
    scene.chips?.length && selected.length < (scene.chipsMin ?? 1),
  );
  return (
    <section
      className={["aethr-wizard", className].filter(Boolean).join(" ")}
      data-slot="aethr-wizard"
    >
      {backdrop ?? (
        <Aethr
          {...(fpsCap === undefined ? {} : { fpsCap })}
          {...(scene.growth === undefined ? {} : { growth: scene.growth })}
          {...(scene.recede === undefined ? {} : { recede: scene.recede })}
          state={scene.state ?? "idle"}
        />
      )}
      <div className="aethr-wizard__stage">
        <CinematicText
          {...(scene.caption === undefined ? {} : { caption: scene.caption })}
        >
          {scene.line}
        </CinematicText>
        {scene.input ? (
          <input
            aria-label={scene.input.placeholder ?? scene.input.id}
            defaultValue={
              scene.input.initialValue ?? values[scene.input.id] ?? ""
            }
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [scene.input!.id]: event.currentTarget.value,
              }))
            }
            placeholder={scene.input.placeholder}
          />
        ) : null}
        {scene.chips?.length ? (
          <div className="aethr-wizard__chips">
            {scene.chips.map((chip) => (
              <button
                aria-pressed={selectedSet.has(chip.id)}
                key={chip.id}
                onClick={() =>
                  setSelected((current) =>
                    new Set(current).has(chip.id)
                      ? current.filter((id) => id !== chip.id)
                      : [...current, chip.id],
                  )
                }
                type="button"
              >
                <strong>{chip.label}</strong>
                {chip.hint ? <small>{chip.hint}</small> : null}
                {chip.badge ? <em>{chip.badge}</em> : null}
              </button>
            ))}
          </div>
        ) : null}
        <div className="aethr-wizard__choices">
          {choices.map((choice, choiceIndex) => (
            <button
              className={
                choice.variant === "primary" ? "is-primary" : undefined
              }
              disabled={busy || (choiceIndex === 0 && gated)}
              key={choice.id}
              onClick={() => void choose(choice)}
              type="button"
            >
              <strong>{choice.label}</strong>
              {choice.hint ? <small>{choice.hint}</small> : null}
            </button>
          ))}
        </div>
        {!choices.length && scene.autoAdvanceMs === undefined ? (
          <button
            className="aethr-wizard__continue"
            onClick={() => advance(scene.next)}
            type="button"
          >
            Continue
          </button>
        ) : null}
      </div>
    </section>
  );
}
