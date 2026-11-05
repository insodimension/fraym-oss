import type { SessionRef } from "@fraym-ai/driver";
import { describe, expect, test } from "bun:test";
import { useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { peekSessionComposerDraftText } from "../features/composer/session-composer-draft";
import type { PermissionActionDef } from "../features/permission-menu/permission-menu";
import { SessionContext, type SessionContextValue } from "../hooks/session-provider";
import { useUsage } from "../hooks/use-usage";
import { useWorkspaceAnalytics } from "../hooks/use-workspace-analytics";
import { ThemeProvider } from "../theme/provider";
import { useEngineConfigState, useEngineResourceState } from "./engine-state";
import { type FraymFrameModel, useFraymFrameModel } from "./fraym-frame-model-core";
import { sessionRefKey } from "./session-groups";

/**
 * A permission-menu ACTION is not an approval mode: picking it seeds the composer
 * and leaves the engine's policy alone. The contracts under test are the ones a
 * user can see — the composer text after a pick, and the mode the menu still shows.
 *
 * `chrome.setComposer` is the same setter every keystroke writes, so an assignment
 * there discarded whatever the user had already typed; the dropdown's placement
 * invites exactly that order (type the question, then pick Chat). These tests drive
 * the real model hook through that sequence.
 *
 * The drivers are absent on purpose (every provider resolves to its real no-driver
 * state); the session is a stub so `setApprovalMode` calls are observable.
 */

const CHAT: PermissionActionDef = {
  id: "chat",
  label: "Chat",
  desc: "Ask without touching the repo",
  icon: "chat",
  tone: "blue",
  composerPrefill: "/chat ",
};

const TYPED = "how do I ship this?";

/**
 * Drives the model by replaying `steps`, one per render: each step runs during the
 * probe's own render, so the state it sets (the composer lives in the probe's hook
 * state) is a render-phase update React applies before the next step. `tick` forces
 * that next render even when a step writes a value the state already holds — which
 * is exactly what the idempotent second pick does.
 */
function PermissionActionProbe({
  sessionRef,
  steps,
  seen,
}: {
  readonly sessionRef: SessionRef;
  readonly steps: readonly ((model: FraymFrameModel) => void)[];
  readonly seen: { composer: string; permission: string };
}) {
  const model = useFraymFrameModel({
    sessionRef,
    permissionActions: [CHAT],
    resources: useEngineResourceState(null, null),
    engineConfig: useEngineConfigState(null, null),
    analytics: useWorkspaceAnalytics(null, null),
    usage: useUsage(null),
    defaultAvatar: "none",
    userName: "Ada",
    userEmail: "ada@example.com",
    planLabel: "Pro",
    productLabel: "Fraym",
    version: "1.2.3",
  });
  seen.composer = model.workspaceProps.composer;
  seen.permission = model.overlayProps.permission;
  const cursor = useRef(0);
  const [, setTick] = useState(0);
  if (cursor.current < steps.length) {
    const step = steps[cursor.current]!;
    cursor.current += 1;
    step(model);
    setTick(tick => tick + 1);
  }
  return null;
}

/** Replays `steps` against a fresh model and reports what the user would see. */
function drive(
  sessionId: string,
  steps: readonly ((model: FraymFrameModel) => void)[],
): { readonly composer: string; readonly permission: string; readonly draft: string | undefined; readonly approvalModes: readonly string[] } {
  const sessionRef: SessionRef = { workspaceId: "ws", sessionId };
  const approvalModes: string[] = [];
  const seen = { composer: "", permission: "" };
  const session = {
    transcript: [],
    activeTools: [],
    tasks: [],
    snapshot: null,
    setApprovalMode: async (mode: string) => void approvalModes.push(mode),
  } as unknown as SessionContextValue;
  renderToStaticMarkup(
    <ThemeProvider>
      <SessionContext.Provider value={session}>
        <PermissionActionProbe sessionRef={sessionRef} steps={steps} seen={seen} />
      </SessionContext.Provider>
    </ThemeProvider>,
  );
  return { ...seen, draft: peekSessionComposerDraftText(sessionRefKey(sessionRef)), approvalModes };
}

const type = (text: string) => (model: FraymFrameModel) => model.workspaceProps.onComposerChange(text);
const pickChat = (model: FraymFrameModel) => model.overlayProps.onPermissionAction?.(CHAT);

describe("permission-menu action prefill", () => {
  test("prepends the prefill and keeps what the user already typed", () => {
    const { composer, draft } = drive("keeps-typed", [type(TYPED), pickChat]);
    expect(composer).toBe(`/chat ${TYPED}`);
    // The split-pane composer reads the session-keyed draft store instead of
    // `chrome.composer`, so the same text has to land there too.
    expect(draft).toBe(`/chat ${TYPED}`);
  });

  test("picking the same action twice does not stack the prefix", () => {
    const { composer, draft } = drive("idempotent", [type(TYPED), pickChat, pickChat]);
    expect(composer).toBe(`/chat ${TYPED}`);
    expect(draft).toBe(`/chat ${TYPED}`);
  });

  test("prefills an empty composer", () => {
    expect(drive("empty-composer", [pickChat]).composer).toBe("/chat ");
  });

  test("leaves the approval mode alone, where picking a mode changes it", () => {
    // The mode a fresh menu shows, whatever it is — the action must not move it.
    const untouched = drive("mode-baseline", []).permission;
    const action = drive("mode-untouched", [type(TYPED), pickChat]);
    const mode = drive("mode-selected", [model => model.overlayProps.onPermissionSelect("plan")]);
    expect({ shown: action.permission, engine: action.approvalModes }).toEqual({ shown: untouched, engine: [] });
    // Teeth for the assertion above: this is what moving the mode looks like.
    expect({ shown: mode.permission, engine: mode.approvalModes }).toEqual({ shown: "plan", engine: ["plan"] });
    expect(mode.permission).not.toBe(untouched);
  });
});
