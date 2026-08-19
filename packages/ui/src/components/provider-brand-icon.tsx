import type { CustomProviderBrand } from "@fraym-ai/config";
import type { CSSProperties } from "react";
import { cn } from "../lib/cn";
import { providerBrand } from "../settings/provider-brand";

export interface ProviderBrandIconProps {
	readonly providerId: string;
	readonly providerName: string;
	/** Optional user-supplied branding (custom-provider display name + logo). */
	readonly brand?: CustomProviderBrand;
	/** Host-supplied provider logo (absolute or root-relative URL, e.g. from
	 *  `EngineProviderRecord.logoUrl`). Takes precedence over the built-in brand
	 *  table and the monogram fallback; yields to `brand.logoUrl`. */
	readonly logoUrl?: string;
	readonly size?: "sm" | "md";
	readonly className?: string;
}

const SIZE_CLASS: Record<NonNullable<ProviderBrandIconProps["size"]>, string> = {
	sm: "size-[34px] rounded-[9px]",
	md: "size-[40px] rounded-[10px]",
};

export function ProviderBrandIcon({
	providerId,
	providerName,
	brand: override,
	logoUrl,
	size = "md",
	className,
}: ProviderBrandIconProps) {
	const brand = providerBrand(providerId, providerName, override, logoUrl);
	const hasLogo = Boolean(brand.logoUrl);
	const style = {
		"--provider-bg": brand.tileBg,
		"--provider-fg": brand.tileFg,
	} as CSSProperties;

	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center overflow-hidden border shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]",
				hasLogo
					? "border-fr-border-soft bg-transparent text-fr-text shadow-none"
					: "border-white/10 bg-[var(--provider-bg)] text-[var(--provider-fg)]",
				SIZE_CLASS[size],
				className,
			)}
			style={style}
			aria-hidden="true"
		>
			{brand.logoUrl ? (
				<img
					className="size-[72%] object-contain"
					src={brand.logoUrl}
					alt=""
					draggable={false}
					style={brand.logoFilter ? { filter: brand.logoFilter } : undefined}
				/>
			) : (
				<span className="font-secondary text-fr-sm font-semibold leading-none">{brand.fallback}</span>
			)}
		</span>
	);
}
