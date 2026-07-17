import { useEffect, useRef, type RefObject } from "react";
import { AethrEngine, type AethrOptions } from "./engine";
import type { AethrParams, AethrState } from "./states";
export interface UseAethrOptions extends AethrOptions {
  state: AethrState;
  params?: Partial<AethrParams>;
}
export function useAethr(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: UseAethrOptions,
): void {
  const engine = useRef<AethrEngine | null>(null);
  const initialOptions = useRef(options);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const current = new AethrEngine(canvas, initialOptions.current);
    engine.current = current;
    const observer = new ResizeObserver(() => current.resize());
    observer.observe(canvas);
    current.start();
    return () => {
      observer.disconnect();
      current.dispose();
      engine.current = null;
    };
  }, [canvasRef]);
  useEffect(() => engine.current?.setState(options.state), [options.state]);
  useEffect(() => {
    if (options.growth !== undefined) engine.current?.setGrowth(options.growth);
  }, [options.growth]);
  useEffect(() => {
    if (options.recede !== undefined) engine.current?.setRecede(options.recede);
  }, [options.recede]);
  useEffect(() => {
    if (options.fpsCap !== undefined) engine.current?.setFpsCap(options.fpsCap);
  }, [options.fpsCap]);
  useEffect(() => {
    if (options.params) engine.current?.setParams(options.params);
  }, [options.params]);
}
