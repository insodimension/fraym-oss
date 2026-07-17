import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { classNames } from "../../elements/utils";

export interface PinDecisionSample {
  readonly top: number;
  readonly height: number;
  readonly clientHeight: number;
  readonly lastTop: number;
  readonly lastHeight: number;
  readonly threshold: number;
  readonly pinned: boolean;
}
export function nextPinnedState({
  top,
  height,
  clientHeight,
  lastTop,
  lastHeight,
  threshold,
  pinned,
}: PinDecisionSample): boolean {
  if (height - top - clientHeight <= threshold) return true;
  return height >= lastHeight && top < lastTop - 1 ? false : pinned;
}
export interface AnchorCompensationSample {
  readonly pinned: boolean;
  readonly desiredTop: number;
  readonly scrollTop: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
}
export function anchorCompensationTop(
  sample: AnchorCompensationSample,
): number | null {
  if (
    sample.pinned ||
    sample.desiredTop > sample.scrollHeight - sample.clientHeight ||
    sample.scrollTop === sample.desiredTop
  )
    return null;
  return sample.desiredTop;
}
interface ScrollViewport {
  readonly scrollHeight: number;
  scrollTo(options: ScrollToOptions): unknown;
}
export function scrollViewportToBottom(
  viewport: ScrollViewport | null,
  behavior: ScrollBehavior,
): void {
  if (!viewport) return;
  viewport.scrollTo({ top: viewport.scrollHeight, behavior });
}
export interface MessageThreadViewportProps {
  readonly children: ReactNode;
  readonly footer?: ReactNode | undefined;
  readonly autoScroll?: boolean;
  readonly pinKey?: string | number;
  readonly threshold?: number;
  readonly hasMoreTop?: boolean;
  readonly onLoadMoreTop?: () => void;
  readonly jumpLabel?: string;
  readonly className?: string;
  readonly contentClassName?: string | undefined;
}
export function MessageThreadViewport({
  children,
  footer,
  autoScroll = true,
  pinKey,
  threshold = 80,
  hasMoreTop = false,
  onLoadMoreTop,
  jumpLabel = "Jump to latest",
  className,
  contentClassName,
}: MessageThreadViewportProps) {
  const scroll = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const last = useRef({ top: 0, height: 0 });
  const [showJump, setShowJump] = useState(false);
  const toBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    scrollViewportToBottom(scroll.current, behavior);
  }, []);
  const onScroll = () => {
    const el = scroll.current;
    if (!el) return;
    if (hasMoreTop && el.scrollTop <= 200) onLoadMoreTop?.();
    pinned.current = nextPinnedState({
      top: el.scrollTop,
      height: el.scrollHeight,
      clientHeight: el.clientHeight,
      lastTop: last.current.top,
      lastHeight: last.current.height,
      threshold,
      pinned: pinned.current,
    });
    last.current = { top: el.scrollTop, height: el.scrollHeight };
    setShowJump(!pinned.current);
  };
  useLayoutEffect(() => {
    toBottom("auto");
  }, [toBottom]);
  useEffect(() => {
    if (pinKey === undefined) return;
    pinned.current = true;
    setShowJump(false);
    toBottom("auto");
  }, [pinKey, toBottom]);
  useEffect(() => {
    if (
      !autoScroll ||
      !content.current ||
      typeof ResizeObserver === "undefined"
    )
      return;
    const observer = new ResizeObserver(() => {
      if (pinned.current) toBottom("auto");
    });
    observer.observe(content.current);
    return () => observer.disconnect();
  }, [autoScroll, toBottom]);
  return (
    <div
      className={classNames("fraym-thread-viewport", className)}
      data-slot="thread-viewport"
    >
      <div
        className={classNames(
          "fraym-thread-viewport__scroll",
          contentClassName,
        )}
        onScroll={onScroll}
        ref={scroll}
      >
        <div ref={content}>
          {children}
          {footer}
        </div>
      </div>
      {showJump ? (
        <button
          className="fraym-thread-viewport__jump"
          onClick={() => {
            pinned.current = true;
            setShowJump(false);
            toBottom();
          }}
          type="button"
        >
          ↓ {jumpLabel}
        </button>
      ) : null}
    </div>
  );
}
