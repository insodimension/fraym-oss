// Real multicolor product logos + first-party plugin marks — the one sanctioned
// home for third-party brand colors (DESIGN.md token discipline governs our chrome,
// not these marks). Shared at the components tier so BOTH the plugins gallery and
// the transcript renderers (skill loads) resolve the same brand glyph.
import type { ReactNode } from "react";

export function GmailMark({ size }: { readonly size: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
			<path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75L35 40h7c1.657 0 3-1.343 3-3V16.2z" />
			<path fill="#1e88e5" d="M3 16.2l3.614 1.71L13 23.7V40H6c-1.657 0-3-1.343-3-3V16.2z" />
			<polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
			<path
				fill="#c62828"
				d="M3 12.298V16.2l10 7.5V11.2L9.876 8.859C9.132 8.301 8.228 8 7.298 8 4.924 8 3 9.924 3 12.298z"
			/>
			<path
				fill="#fbc02d"
				d="M45 12.298V16.2l-10 7.5V11.2l3.124-2.341C38.868 8.301 39.772 8 40.702 8 43.076 8 45 9.924 45 12.298z"
			/>
		</svg>
	);
}

export function GoogleDriveMark({ size }: { readonly size: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 87.3 78" aria-hidden="true" focusable="false">
			<path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
			<path
				d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
				fill="#00ac47"
			/>
			<path
				d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
				fill="#ea4335"
			/>
			<path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
			<path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
			<path
				d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
				fill="#ffba00"
			/>
		</svg>
	);
}

// First-party plugin marks — gradient app tiles with a knockout glyph. Token
// colors only; transparent outside the rounded tile.
export function FeedbackMark({ size }: { readonly size: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
			<defs>
				<linearGradient id="fr-mk-feedback" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
					<stop offset="0" stopColor="var(--fr-iris)" />
					<stop offset="1" stopColor="var(--fr-accent)" />
				</linearGradient>
			</defs>
			<rect width="48" height="48" rx="12" fill="url(#fr-mk-feedback)" />
			<rect x="12" y="14" width="24" height="17" rx="4.5" fill="#fff" />
			<path d="M18 30 L18 37 L25 30 Z" fill="#fff" />
			<circle cx="19" cy="22.5" r="1.7" fill="url(#fr-mk-feedback)" />
			<circle cx="24" cy="22.5" r="1.7" fill="url(#fr-mk-feedback)" />
			<circle cx="29" cy="22.5" r="1.7" fill="url(#fr-mk-feedback)" />
		</svg>
	);
}

export function BoardMark({ size }: { readonly size: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
			<defs>
				<linearGradient id="fr-mk-board" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
					<stop offset="0" stopColor="var(--fr-info)" />
					<stop offset="1" stopColor="var(--fr-iris)" />
				</linearGradient>
			</defs>
			<rect width="48" height="48" rx="12" fill="url(#fr-mk-board)" />
			<rect x="13" y="14" width="6.5" height="20" rx="2.5" fill="#fff" />
			<rect x="20.75" y="14" width="6.5" height="20" rx="2.5" fill="#fff" fillOpacity="0.85" />
			<rect x="28.5" y="14" width="6.5" height="20" rx="2.5" fill="#fff" fillOpacity="0.7" />
		</svg>
	);
}

export const BRAND_MARKS: Record<string, (size: number) => ReactNode> = {
	gmail: size => <GmailMark size={size} />,
	drive: size => <GoogleDriveMark size={size} />,
	feedback: size => <FeedbackMark size={size} />,
	board: size => <BoardMark size={size} />,
};

/** Resolve a brand mark whose key appears in `hay` (e.g. an id+name, or a `skill://gmail`
 *  path), or `undefined` when none — caller falls back to a generic glyph. */
export function brandMarkFor(hay: string, size: number): ReactNode | undefined {
	const key = Object.keys(BRAND_MARKS).find(brand => hay.toLowerCase().includes(brand));
	return key ? BRAND_MARKS[key]?.(size) : undefined;
}
