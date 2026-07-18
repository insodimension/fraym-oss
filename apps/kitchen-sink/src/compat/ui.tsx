import { clsx, type ClassValue } from "clsx";
import {
	findFontPreset,
	findThemePreset,
	themeVariantFor,
	THEME_VAR_MAP,
} from "@fraym/ui/theme";
import {
	memo,
	type CSSProperties,
	type SVGAttributes,
	useSyncExternalStore,
} from "react";
import { extendTailwindMerge } from "tailwind-merge";
import { fraymBrandMarkUrl } from "./brand-asset";
import { iconPaths, type IconName } from "./icon-paths";

const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			"font-size": [
				{ text: ["fr-2xs", "fr-xs", "fr-sm", "fr-base", "fr-md", "fr-lg", "fr-xl", "fr-2xl", "fr-3xl"] },
			],
			"text-color": [
				{
					text: [
						"fr-text", "fr-text-2", "fr-text-3", "fr-accent", "fr-accent-2",
						"fr-accent-ink", "fr-add", "fr-del", "fr-warn", "fr-blue", "fr-iris",
					],
				},
			],
			tracking: [{ tracking: ["fr-tight", "fr-label", "fr-caps"] }],
			"font-family": [{ font: ["primary", "display"] }],
		},
	},
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type { IconName };
export interface IconProps extends SVGAttributes<SVGSVGElement> {
	readonly name: IconName;
	readonly size?: number;
	readonly strokeWidth?: number;
	readonly filled?: boolean;
}

export const Icon = memo(function Icon({
	name,
	size = 16,
	strokeWidth = 1.8,
	filled = false,
	viewBox = "0 0 24 24",
	className,
	...props
}: IconProps) {
	const parts = (iconPaths[name] ?? iconPaths.code).split("|");
	return (
		<svg
			data-slot="icon"
			width={size}
			height={size}
			viewBox={viewBox}
			fill={filled ? "currentColor" : "none"}
			stroke={filled ? "none" : "currentColor"}
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={cn("shrink-0", className)}
			{...props}
		>
			{parts.map((d, index) => <path key={index} d={d} />)}
		</svg>
	);
});

export interface FraymBrandMarkProps {
	readonly className?: string;
	readonly decorative?: boolean;
	readonly label?: string;
	readonly size?: number | string;
	readonly style?: CSSProperties;
}

export function FraymBrandMark({
	className,
	decorative = true,
	label = "Fraym",
	size = 22,
	style,
}: FraymBrandMarkProps) {
	return (
		<img
			src={fraymBrandMarkUrl}
			alt={decorative ? "" : label}
			aria-hidden={decorative ? "true" : undefined}
			draggable={false}
			className={cn("block shrink-0 select-none object-contain", className)}
			style={{ width: size, height: size, ...style }}
		/>
	);
}

interface KitchenSettings {
	readonly accentStyle: "solid" | "gradient";
	readonly fontPreset: string;
	readonly uiFont: string;
	readonly codeFont: string;
	readonly themePreset: string;
}

const initialConfig: KitchenSettings = {
	accentStyle: "solid",
	fontPreset: "plex",
	uiFont: "",
	codeFont: "",
	themePreset: "",
};

let config = initialConfig;
const listeners = new Set<() => void>();

function applySettings(next: KitchenSettings) {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	const font = findFontPreset(next.fontPreset);
	if (font) {
		root.style.setProperty("--fr-font-primary", font.primary);
		root.style.setProperty("--fr-font-mono", font.mono);
	}
	const preset = next.themePreset ? findThemePreset(next.themePreset) : undefined;
	if (preset) {
		const mode = root.dataset.theme === "light" ? "light" : "dark";
		const variant = themeVariantFor(preset, mode);
		for (const key of Object.keys(THEME_VAR_MAP) as (keyof typeof THEME_VAR_MAP)[]) {
			if (preset.inheritAccent && key.startsWith("accent")) continue;
			root.style.setProperty(THEME_VAR_MAP[key], variant[key]);
		}
	}
}

function setConfig(next: KitchenSettings) {
	if (
		config.accentStyle === next.accentStyle &&
		config.fontPreset === next.fontPreset &&
		config.uiFont === next.uiFont &&
		config.codeFont === next.codeFont &&
		config.themePreset === next.themePreset
	) return;
	config = next;
	applySettings(config);
	for (const listener of listeners) listener();
}

export function useSettings() {
	const current = useSyncExternalStore(
		(listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		() => config,
		() => config,
	);
	return {
		config: current,
		update<K extends keyof KitchenSettings>(key: K, value: KitchenSettings[K]) {
			setConfig({ ...config, [key]: value });
		},
		patch(values: Partial<KitchenSettings>) {
			setConfig({ ...config, ...values });
		},
	};
}
