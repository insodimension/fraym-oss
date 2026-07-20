import { providerBrand } from "../settings/provider-brand";

/** Provider logo tile — brand image when the provider ships one, else the
 *  hash-stable brand color + fallback glyph. Shared by the model team builder
 *  and the model insights hub. */
export function BrandTile({
	providerId,
	providerName,
	size,
}: {
	readonly providerId: string;
	readonly providerName: string;
	readonly size: number;
}) {
	const brand = providerBrand(providerId, providerName);
	return (
		<span
			aria-hidden="true"
			className="flex shrink-0 items-center justify-center overflow-hidden border border-white/10"
			style={{
				width: size,
				height: size,
				borderRadius: Math.max(5, Math.round(size * 0.27)),
				background: brand.logoUrl ? "var(--fr-surface-3)" : brand.tileBg,
				color: brand.tileFg,
			}}
		>
			{brand.logoUrl ? (
				<img
					src={brand.logoUrl}
					alt=""
					draggable={false}
					className="size-[62%] object-contain"
					style={brand.logoFilter ? { filter: brand.logoFilter } : undefined}
				/>
			) : (
				<span className="font-secondary font-semibold" style={{ fontSize: Math.max(8, size * 0.34) }}>
					{brand.fallback}
				</span>
			)}
		</span>
	);
}
