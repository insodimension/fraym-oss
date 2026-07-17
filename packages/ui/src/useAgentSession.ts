import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import type { AgentEventStream, Unsubscribe } from "@fraym/driver";

import { createThreadState, reduceThreadEvent, type ThreadState } from "./thread-state";

export interface AgentSessionSnapshot {
  state: ThreadState;
  streaming: boolean;
  stop: () => void;
}

export function useAgentSession(source: AgentEventStream): AgentSessionSnapshot {
  const [state, dispatch] = useReducer(reduceThreadEvent, undefined, createThreadState);
  const [stopped, setStopped] = useState(false);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    setStopped(false);
    const unsubscribe = source.subscribe(dispatch);
    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribe();
      if (unsubscribeRef.current === unsubscribe) unsubscribeRef.current = null;
    };
  }, [source]);

  const stop = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setStopped(true);
  }, []);

  return {
    state,
    streaming: state.phase !== "done" && state.phase !== "error" && !stopped,
    stop,
  };
}
