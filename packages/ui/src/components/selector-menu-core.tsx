import { useState } from "react";
import { type Placement, popoverStyle } from "../elements/popover";
import { Icon } from "../icons";
import { BodyPortal } from "../lib/body-portal";
import { cn } from "../lib/cn";
import { BottomSheet, useIsPhoneWidth } from "./bottom-sheet";
import { InputGroup } from "./input-group";

const DEFAULT_PANEL_WIDTH = 300;
const DEFAULT_SEARCH_WIDTH = 320;
const DEFAULT_FLYOUT_WIDTH = 290;
const FLYOUT_GAP = 8;
const FLYOUT_MAX_HEIGHT = 440;
const FLYOUT_MIN_VISIBLE = 200;

function currentViewportWidth(): number {
	return typeof window !== "undefined" && Number.isFinite(window.innerWidth) ? window.innerWidth : 1280;
}

function currentViewportHeight(): number {
	return typeof window !== "undefined" && Number.isFinite(window.innerHeight) ? window.innerHeight : 800;
}

/** Anchor the category flyout to the hovered ROW: vertically aligned to the row and docked
 * just past the panel's right edge (flipping left when there's no room), capping its height
 * to the space below. Previously it pinned to the panel's bottom, so it detached and dropped. */
function flyoutStyle(rect: DOMRect | null, flyoutWidth: number): React.CSSProperties {
	if (!rect) return {};
	const viewportW = currentViewportWidth();
	const viewportH = currentViewportHeight();
	const rightOf = rect.right + FLYOUT_GAP;
	const left = rightOf + flyoutWidth <= viewportW - 8 ? rightOf : Math.max(8, rect.left - flyoutWidth - FLYOUT_GAP);
	const top = Math.max(8, Math.min(rect.top - 6, viewportH - FLYOUT_MIN_VISIBLE - 8));
	const maxHeight = Math.min(FLYOUT_MAX_HEIGHT, viewportH - top - 12);
	return { left, top, maxHeight };
}

function allItems<TItem>(
	categories: readonly SelectorMenuCategory<TItem>[],
	getItemId: (item: TItem) => string,
): TItem[] {
	const seen = new Set<string>();
	const all: TItem[] = [];
	for (const category of categories) {
		for (const item of category.items) {
			const id = getItemId(item);
			if (seen.has(id)) continue;
			seen.add(id);
			all.push(item);
		}
	}
	return all;
}

function defaultFilter<TItem>(items: readonly TItem[], query: string, getItemId: (item: TItem) => string): TItem[] {
	const ql = query.trim().toLowerCase();
	if (!ql) return [...items];
	return items.filter(item => getItemId(item).toLowerCase().includes(ql));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectorMenuCategory<TItem> {
	readonly id: string;
	readonly label: string;
	readonly items: readonly TItem[];
	/** Optional provider identifier for category rows that represent a provider (e.g. "acme").
	 *  When present, `renderCategoryIcon` can render a provider brand logo instead of a generic glyph. */
	readonly providerId?: string;
	/** Optional host-supplied provider logo (absolute or root-relative URL) for a
	 *  provider category row, so `renderCategoryIcon` can render the host's own
	 *  mark instead of a built-in brand asset or monogram. */
	readonly providerLogoUrl?: string;
}

export interface SelectorMenuProps<TItem> {
	/** Categorized items. */
	readonly categories: readonly SelectorMenuCategory<TItem>[];
	/** Identity of the currently-selected item (compared against `getItemId`). */
	readonly selectedId: string;
	/** Extract a stable string identity from an item. */
	readonly getItemId: (item: TItem) => string;

	/** Controlled search query. */
	readonly query: string;
	/** Called when the user types in the search field. */
	readonly onQueryChange: (query: string) => void;
	/** Placeholder text for the search field. */
	readonly searchPlaceholder?: string;

	/** Optional filter function; defaults to matching `getItemId(item)` against the query. */
	readonly filter?: (items: readonly TItem[], query: string) => readonly TItem[];

	/** Render a single item row. Receives the item, whether it is selected, and a pick callback. */
	readonly renderItem: (item: TItem, selected: boolean, onPick: () => void) => React.ReactNode;
	/** Optional icon rendered before each category label in the rail. */
	readonly renderCategoryIcon?: (category: SelectorMenuCategory<TItem>) => React.ReactNode;
	/** Optional custom label for a category row; defaults to `category.label`. */
	readonly renderCategoryLabel?: (category: SelectorMenuCategory<TItem>) => React.ReactNode;
	/** Optional header rendered at the top of the category flyout. */
	readonly renderFlyoutHeader?: (category: SelectorMenuCategory<TItem>) => React.ReactNode;

	/** Content rendered inside the scrollable area before the category list. */
	readonly beforeCategories?: React.ReactNode;
	/** Fixed footer rendered below the scrollable area. */
	readonly footer?: React.ReactNode;

	/** Trigger rect to anchor against (preferred). Falls back to `style`. */
	readonly anchorRect?: DOMRect | null;
	readonly place?: Placement;
	readonly style?: React.CSSProperties;
	readonly className?: string;

	/** Called when the user picks an item. */
	readonly onPick: (item: TItem) => void;
	/** Called when the scrim is clicked or the consumer otherwise wants to close. */
	readonly onClose: () => void;

	/** Width of the main panel (px). Defaults to 300. */
	readonly panelWidth?: number;
	/** Width of the search-results panel (px). Defaults to 320. */
	readonly searchWidth?: number;
	/** Width of the category flyout (px). Defaults to 290. */
	readonly flyoutWidth?: number;

	/** Eyebrow title for the phone-width bottom sheet (e.g. "Choose model"). */
	readonly sheetTitle?: string;
}

// ---------------------------------------------------------------------------
// Internal components
// ---------------------------------------------------------------------------

function SelectorMenuPanel({
	width,
	style,
	className,
	children,
}: {
	readonly width: number;
	readonly style?: React.CSSProperties;
	readonly className?: string;
	readonly children: React.ReactNode;
}) {
	return (
		<div
			data-slot="selector-menu"
			className={cn(
				"fixed z-50 flex max-h-[min(540px,80vh)] flex-col rounded-[12px] border border-fr-border bg-fr-surface p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.5)] animate-[fr-pop-in_0.12s_ease]",
				className,
			)}
			style={{ width, ...style }}
		>
			{children}
		</div>
	);
}

function SelectorMenuSearchField({
	query,
	onQueryChange,
	placeholder,
	autoFocus = true,
}: {
	readonly query: string;
	onQueryChange: (query: string) => void;
	placeholder?: string;
	/** Phone sheet passes false — autofocusing would pop the keyboard over half the sheet. */
	autoFocus?: boolean;
}) {
	return (
		<div className="mx-0.5 mt-0.5 mb-1">
			<InputGroup
				variant="ghost"
				leading={<Icon name="search" size={14} strokeWidth={1.8} className="shrink-0" />}
				autoFocus={autoFocus}
				value={query}
				onChange={event => onQueryChange(event.target.value)}
				placeholder={placeholder ?? "Search..."}
			/>
		</div>
	);
}

function SelectorMenuCategoryRows<TItem>({
	categories,
	selectedId,
	hoveredCat,
	onHover,
	getItemId,
	renderCategoryIcon,
	renderCategoryLabel,
}: {
	readonly categories: readonly SelectorMenuCategory<TItem>[];
	readonly selectedId: string;
	readonly hoveredCat: string | null;
	readonly onHover: (categoryId: string, rect: DOMRect) => void;
	readonly getItemId: (item: TItem) => string;
	readonly renderCategoryIcon?: (category: SelectorMenuCategory<TItem>) => React.ReactNode;
	readonly renderCategoryLabel?: (category: SelectorMenuCategory<TItem>) => React.ReactNode;
}) {
	return (
		<>
			{categories.map(category => {
				const has = category.items.some(item => getItemId(item) === selectedId);
				const isActive = hoveredCat === category.id;
				return (
					<div
						key={category.id}
						data-slot="selector-category-row"
						data-category-id={category.id}
						className={cn(
							"flex cursor-pointer items-center gap-[9px] rounded-[7px] px-2.5 py-[7px] font-rail text-fr-base text-fr-text-2 transition-colors hover:bg-fr-surface-2 hover:text-fr-text",
							isActive && "bg-fr-surface-2 text-fr-text",
						)}
						onMouseEnter={event => onHover(category.id, event.currentTarget.getBoundingClientRect())}
						onClick={event => onHover(category.id, event.currentTarget.getBoundingClientRect())}
					>
						{renderCategoryIcon ? renderCategoryIcon(category) : null}
						<span>{renderCategoryLabel ? renderCategoryLabel(category) : category.label}</span>
						{has && <span className="size-[5px] shrink-0 rounded-full bg-fr-accent" />}
						<span className={cn("ml-auto text-fr-2xs", isActive ? "text-fr-text-2" : "text-fr-text-3")}>
							{category.items.length}
						</span>
						<Icon name="caretR" size={13} strokeWidth={2} className="shrink-0 text-fr-text-3" />
					</div>
				);
			})}
		</>
	);
}

function SelectorMenuFlyout<TItem>({
	category,
	selectedId,
	getItemId,
	style,
	flyoutWidth,
	onPick,
	renderItem,
	renderFlyoutHeader,
}: {
	readonly category: SelectorMenuCategory<TItem> | null;
	readonly selectedId: string;
	readonly getItemId: (item: TItem) => string;
	readonly style: React.CSSProperties;
	readonly flyoutWidth: number;
	readonly onPick: (item: TItem) => void;
	readonly renderItem: (item: TItem, selected: boolean, onPick: () => void) => React.ReactNode;
	readonly renderFlyoutHeader?: (category: SelectorMenuCategory<TItem>) => React.ReactNode;
}) {
	if (!category) return null;
	return (
		<div
			data-slot="selector-flyout"
			className="fixed z-[55] overflow-y-auto rounded-[12px] border border-fr-border bg-fr-surface p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.5)] animate-[fr-pop-in_0.1s_ease]"
			style={{ width: flyoutWidth, ...style }}
		>
			{renderFlyoutHeader ? renderFlyoutHeader(category) : null}
			{category.items.map(item => (
				<div key={`sub-${getItemId(item)}`}>
					{renderItem(item, selectedId === getItemId(item), () => onPick(item))}
				</div>
			))}
		</div>
	);
}

function SelectorMenuSearchResults<TItem>({
	query,
	hits,
	selectedId,
	getItemId,
	onQueryChange,
	onPick,
	onClose,
	renderItem,
	searchPlaceholder,
	searchWidth,
	style,
	className,
}: {
	readonly query: string;
	readonly hits: readonly TItem[];
	readonly selectedId: string;
	readonly getItemId: (item: TItem) => string;
	readonly onQueryChange: (query: string) => void;
	readonly onPick: (item: TItem) => void;
	readonly onClose: () => void;
	readonly renderItem: (item: TItem, selected: boolean, onPick: () => void) => React.ReactNode;
	readonly searchPlaceholder?: string;
	readonly searchWidth: number;
	readonly style?: React.CSSProperties;
	readonly className?: string;
}) {
	return (
		<BodyPortal>
			<div className="fixed inset-0 z-40" onClick={onClose} />
			<SelectorMenuPanel
				width={searchWidth}
				{...(style !== undefined ? { style } : {})}
				{...(className !== undefined ? { className } : {})}
			>
				<SelectorMenuSearchField
					query={query}
					onQueryChange={onQueryChange}
					{...(searchPlaceholder !== undefined ? { placeholder: searchPlaceholder } : {})}
				/>
				<div className="max-h-[330px] overflow-y-auto">
					{hits.length ? (
						hits.map(item => (
							<div key={getItemId(item)}>
								{renderItem(item, selectedId === getItemId(item), () => onPick(item))}
							</div>
						))
					) : (
						<div className="px-3 py-[18px] text-center text-xs text-fr-text-3">
							No results match "{query.trim()}".
						</div>
					)}
				</div>
			</SelectorMenuPanel>
		</BodyPortal>
	);
}

/** Phone-width surface: the whole picker inside a BottomSheet. Categories are
 * tap-to-drill in-sheet pages (no hover flyouts), search results replace the
 * list, and the footer (e.g. the effort picker) pins under the scroll area. */
function SelectorMenuSheet<TItem>({
	categories,
	selectedId,
	getItemId,
	query,
	onQueryChange,
	searchPlaceholder,
	filter,
	renderItem,
	renderCategoryIcon,
	renderCategoryLabel,
	beforeCategories,
	footer,
	onPick,
	onClose,
	sheetTitle,
}: SelectorMenuProps<TItem>) {
	const [openCatId, setOpenCatId] = useState<string | null>(null);
	const openCat = openCatId ? (categories.find(category => category.id === openCatId) ?? null) : null;
	const searching = query.trim().length > 0;

	const rows = (items: readonly TItem[], keyPrefix: string) =>
		items.map(item => (
			<div key={`${keyPrefix}-${getItemId(item)}`}>
				{renderItem(item, selectedId === getItemId(item), () => onPick(item))}
			</div>
		));

	let body: React.ReactNode;
	if (searching) {
		const all = allItems(categories, getItemId);
		const hits = filter ? filter(all, query) : defaultFilter(all, query, getItemId);
		body = hits.length ? (
			rows(hits, "hit")
		) : (
			<div className="px-3 py-[18px] text-center text-xs text-fr-text-3">No results match "{query.trim()}".</div>
		);
	} else if (openCat) {
		body = (
			<>
				<button
					type="button"
					data-slot="sheet-back"
					className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2.5 font-rail text-fr-base text-fr-text-2 hover:bg-fr-surface-2"
					onClick={() => setOpenCatId(null)}
				>
					<Icon name="caretR" size={13} strokeWidth={2} className="shrink-0 rotate-180 text-fr-text-3" />
					<span>{renderCategoryLabel ? renderCategoryLabel(openCat) : openCat.label}</span>
					<span className="ml-auto text-fr-2xs text-fr-text-3">{openCat.items.length}</span>
				</button>
				<div className="mx-1 mb-1 h-px bg-fr-border-soft" />
				{rows(openCat.items, "cat")}
			</>
		);
	} else {
		body = (
			<>
				{beforeCategories}
				{categories.map(category => {
					const has = category.items.some(item => getItemId(item) === selectedId);
					return (
						<div
							key={category.id}
							data-slot="selector-category-row"
							data-category-id={category.id}
							className="flex cursor-pointer items-center gap-[9px] rounded-[7px] px-2.5 py-[7px] font-rail text-fr-base text-fr-text-2 transition-colors hover:bg-fr-surface-2 hover:text-fr-text"
							onClick={() => setOpenCatId(category.id)}
						>
							{renderCategoryIcon ? renderCategoryIcon(category) : null}
							<span>{renderCategoryLabel ? renderCategoryLabel(category) : category.label}</span>
							{has && <span className="size-[5px] shrink-0 rounded-full bg-fr-accent" />}
							<span className="ml-auto text-fr-2xs text-fr-text-3">{category.items.length}</span>
							<Icon name="caretR" size={13} strokeWidth={2} className="shrink-0 text-fr-text-3" />
						</div>
					);
				})}
			</>
		);
	}

	return (
		<BottomSheet onClose={onClose} title={sheetTitle} footer={footer} ariaLabel={sheetTitle ?? "Choose"}>
			<SelectorMenuSearchField
				query={query}
				onQueryChange={onQueryChange}
				{...(searchPlaceholder !== undefined ? { placeholder: searchPlaceholder } : {})}
				autoFocus={false}
			/>
			{body}
		</BottomSheet>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SelectorMenu<TItem>(props: SelectorMenuProps<TItem>) {
	const [hoveredCat, setHoveredCat] = useState<string | null>(null);
	const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
	const phone = useIsPhoneWidth();

	const {
		categories,
		selectedId,
		getItemId,
		query,
		onQueryChange,
		searchPlaceholder,
		filter,
		renderItem,
		renderCategoryIcon,
		renderCategoryLabel,
		renderFlyoutHeader,
		beforeCategories,
		footer,
		anchorRect,
		place,
		style: rootStyleProp,
		className,
		onPick,
		onClose,
		panelWidth = DEFAULT_PANEL_WIDTH,
		searchWidth = DEFAULT_SEARCH_WIDTH,
		flyoutWidth = DEFAULT_FLYOUT_WIDTH,
	} = props;

	const panelStyle = anchorRect ? popoverStyle(anchorRect, place ?? "above-right", panelWidth) : rootStyleProp;
	const searchStyle = anchorRect ? popoverStyle(anchorRect, place ?? "above-right", searchWidth) : rootStyleProp;
	const activeCat = hoveredCat ? (categories.find(category => category.id === hoveredCat) ?? null) : null;

	if (phone) return <SelectorMenuSheet {...props} />;

	if (query.trim()) {
		const all = allItems(categories, getItemId);
		const hits = filter ? filter(all, query) : defaultFilter(all, query, getItemId);
		return (
			<SelectorMenuSearchResults
				query={query}
				hits={hits}
				selectedId={selectedId}
				getItemId={getItemId}
				onQueryChange={onQueryChange}
				onPick={onPick}
				onClose={onClose}
				renderItem={renderItem}
				{...(searchPlaceholder !== undefined ? { searchPlaceholder } : {})}
				searchWidth={searchWidth}
				{...(searchStyle !== undefined ? { style: searchStyle } : {})}
				{...(className !== undefined ? { className } : {})}
			/>
		);
	}

	return (
		<BodyPortal>
			<div className="fixed inset-0 z-40" onClick={onClose} />
			<SelectorMenuPanel
				width={panelWidth}
				{...(panelStyle !== undefined ? { style: panelStyle } : {})}
				{...(className !== undefined ? { className } : {})}
			>
				<SelectorMenuSearchField
					query={query}
					onQueryChange={onQueryChange}
					{...(searchPlaceholder !== undefined ? { placeholder: searchPlaceholder } : {})}
				/>
				<div className="mx-[-2px] max-h-[340px] overflow-y-auto px-0.5">
					{beforeCategories}
					<SelectorMenuCategoryRows
						categories={categories}
						selectedId={selectedId}
						hoveredCat={hoveredCat}
						onHover={(categoryId, rect) => {
							setHoveredCat(categoryId);
							setHoveredRect(rect);
						}}
						getItemId={getItemId}
						{...(renderCategoryIcon !== undefined ? { renderCategoryIcon } : {})}
						{...(renderCategoryLabel !== undefined ? { renderCategoryLabel } : {})}
					/>
				</div>
				{footer}
			</SelectorMenuPanel>
			<SelectorMenuFlyout
				category={activeCat}
				selectedId={selectedId}
				getItemId={getItemId}
				style={flyoutStyle(hoveredRect, flyoutWidth)}
				flyoutWidth={flyoutWidth}
				onPick={onPick}
				renderItem={renderItem}
				{...(renderFlyoutHeader !== undefined ? { renderFlyoutHeader } : {})}
			/>
		</BodyPortal>
	);
}
