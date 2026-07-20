import { useEffect, useRef, useState } from "react";

interface LazyPreviewProps {
	readonly root: React.RefObject<HTMLDivElement | null>;
	readonly children: React.ReactNode;
}

/** Keeps heavy live previews mounted only while their tile is near the viewport. */
export function LazyPreview({ root, children }: LazyPreviewProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const [visible, setVisible] = useState(true);

	useEffect(() => observePreviewVisibility(ref.current, root.current, setVisible), [root]);

	return (
		<span ref={ref} className="flex h-[84px] w-full items-center justify-center">
			{visible ? children : null}
		</span>
	);
}

function observePreviewVisibility(
	element: HTMLSpanElement | null,
	root: HTMLDivElement | null,
	setVisible: (visible: boolean) => void,
) {
	if (!element) return;
	const observer = new IntersectionObserver(entries => updateVisibility(entries, setVisible), {
		root,
		rootMargin: "200px",
	});
	observer.observe(element);
	return () => observer.disconnect();
}

function updateVisibility(entries: readonly IntersectionObserverEntry[], setVisible: (visible: boolean) => void) {
	for (const entry of entries) setVisible(entry.isIntersecting);
}
