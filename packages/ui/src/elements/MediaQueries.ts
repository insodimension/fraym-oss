import { useEffect, useState } from "react";

function useMediaQuery(query: string, serverFallback: boolean): boolean {
  const [matches, setMatches] = useState(serverFallback);
  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

export function useReducedMotion(): boolean { return useMediaQuery("(prefers-reduced-motion: reduce)", false); }
export function useHoverCapable(): boolean { return useMediaQuery("(hover: hover) and (pointer: fine)", false); }
