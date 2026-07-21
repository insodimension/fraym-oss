import type {
	EngineConfigCatalog,
	EngineConfigSnapshot,
	EngineProviderAccountSelectionPolicy,
	EngineProviderRecord,
	EngineResourceSnapshot,
} from "@fraym-ai/driver";
import { useEffect, useMemo, useState } from "react";
import { ProviderAccountSwitcher } from "../../components/provider-account-switcher";
import { Input } from "../../elements/input";
import { Skeleton, SkeletonGroup } from "../../elements/skeleton";
import {
	CONNECTIONS_API_PATHS,
	CONNECTIONS_IMAGE_PATHS,
	CONNECTIONS_SEARCH_PATHS,
} from "../../settings/engine-settings-panes";
import { configRecordsByPath, configValuesByPath, ModelConfigGroup } from "./engine-config-common";
import { SettingsGroup, SettingsRow, SettingsSub, SettingsTitle } from "./settings-controls";

function providerStatus(provider: EngineProviderRecord): string {
	if (provider.authType === "none") return "No auth required";
	if (provider.hasAuth) return provider.authSource === "oauth" ? "OAuth connected" : "API key connected";
	return "Not connected";
}

function ProviderAccountsSection({
	provider,
	loading,
	onPinAccount,
	onSetAccountPolicy,
	onSetAccountPriorityOrder,
}: {
	readonly provider: EngineProviderRecord;
	readonly loading: boolean;
	readonly onPinAccount?: (providerId: string, accountKey: string | null) => void;
	readonly onSetAccountPolicy?: (providerId: string, policy: EngineProviderAccountSelectionPolicy) => void;
	readonly onSetAccountPriorityOrder?: (providerId: string, order: readonly string[]) => void;
}) {
	if (!provider.accounts?.length || !(onPinAccount && onSetAccountPolicy && onSetAccountPriorityOrder)) return null;
	return (
		<SettingsGroup heading={`${provider.name} accounts`}>
			<SettingsSub>Switch the active credential without touching the SQLite store.</SettingsSub>
			<ProviderAccountSwitcher
				provider={provider}
				loading={loading}
				onPinAccount={onPinAccount}
				onSetAccountPolicy={onSetAccountPolicy}
				onSetAccountPriorityOrder={onSetAccountPriorityOrder}
			/>
		</SettingsGroup>
	);
}

/** One `ProviderAccountsSection` per provider with 2+ signed-in accounts,
 *  driven uniformly by the provider resource contract. */
function ProviderAccountsSettingsGroup({
	providers,
	loading,
	onPinAccount,
	onSetAccountPolicy,
	onSetAccountPriorityOrder,
}: {
	readonly providers: readonly EngineProviderRecord[];
	readonly loading: boolean;
	readonly onPinAccount?: (providerId: string, accountKey: string | null) => void;
	readonly onSetAccountPolicy?: (providerId: string, policy: EngineProviderAccountSelectionPolicy) => void;
	readonly onSetAccountPriorityOrder?: (providerId: string, order: readonly string[]) => void;
}) {
	const multiAccountProviders = providers.filter(provider => (provider.accounts?.length ?? 0) > 1);
	if (multiAccountProviders.length === 0) return null;
	return (
		<>
			{multiAccountProviders.map(provider => (
				<ProviderAccountsSection
					key={provider.id}
					provider={provider}
					loading={loading}
					onPinAccount={onPinAccount}
					onSetAccountPolicy={onSetAccountPolicy}
					onSetAccountPriorityOrder={onSetAccountPriorityOrder}
				/>
			))}
		</>
	);
}

export interface ProviderPreferencesPaneProps {
	readonly configCatalog?: EngineConfigCatalog | null;
	readonly configSnapshot?: EngineConfigSnapshot | null;
	readonly configLoading?: boolean;
	readonly onConfigValueChange?: (path: string, value: unknown) => void | Promise<void>;
	readonly onConfigValueReset?: (path: string) => void | Promise<void>;
}

/**
 * Provider preference settings (search / image / API behavior) rendered from the
 * engine config catalog. Shared by the Connections manager (as its preferences
 * section) and the standalone `EngineConnectionsPane`. Renders nothing until the
 * config catalog is connected.
 */
export function ProviderPreferencesPane({
	configCatalog,
	configSnapshot,
	configLoading = false,
	onConfigValueChange,
	onConfigValueReset,
}: ProviderPreferencesPaneProps) {
	const recordsByPath = useMemo(() => configRecordsByPath(configCatalog), [configCatalog]);
	const configValues = useMemo(() => configValuesByPath(configSnapshot), [configSnapshot]);
	if (!configCatalog) return null;
	return (
		<>
			<ModelConfigGroup
				heading="Search providers"
				description="Web and Exa search backends used by the search tools."
				paths={CONNECTIONS_SEARCH_PATHS}
				recordsByPath={recordsByPath}
				valuesByPath={configValues}
				loading={configLoading}
				onChange={onConfigValueChange}
				onReset={onConfigValueReset}
			/>
			<ModelConfigGroup
				heading="Image generation"
				paths={CONNECTIONS_IMAGE_PATHS}
				recordsByPath={recordsByPath}
				valuesByPath={configValues}
				loading={configLoading}
				onChange={onConfigValueChange}
				onReset={onConfigValueReset}
			/>
			<ModelConfigGroup
				heading="API behavior"
				description="Credential storage and provider request behavior."
				paths={CONNECTIONS_API_PATHS}
				recordsByPath={recordsByPath}
				valuesByPath={configValues}
				loading={configLoading}
				onChange={onConfigValueChange}
				onReset={onConfigValueReset}
			/>
		</>
	);
}
export interface EngineConnectionsPaneProps {
	readonly snapshot?: EngineResourceSnapshot | null;
	readonly loading?: boolean;
	readonly error?: string | null;
	readonly onRefresh?: () => void;
	readonly onProviderApiKeySubmit?: (providerId: string, apiKey: string) => void;
	readonly onPinAccount?: (providerId: string, accountKey: string | null) => void;
	readonly onSetAccountPolicy?: (providerId: string, policy: EngineProviderAccountSelectionPolicy) => void;
	readonly onSetAccountPriorityOrder?: (providerId: string, order: readonly string[]) => void;
	readonly onProviderLogout?: (providerId: string) => void;
	readonly configCatalog?: EngineConfigCatalog | null;
	readonly configSnapshot?: EngineConfigSnapshot | null;
	readonly configLoading?: boolean;
	readonly onConfigValueChange?: (path: string, value: unknown) => void | Promise<void>;
	readonly onConfigValueReset?: (path: string) => void | Promise<void>;
}

function useApiKeyProviderSelection(providers: readonly EngineProviderRecord[]) {
	const apiKeyProviders = useMemo(() => providers.filter(provider => provider.apiKeySetupSupported), [providers]);
	const [providerId, setProviderId] = useState(apiKeyProviders[0]?.id ?? "");
	const [apiKey, setApiKey] = useState("");
	const apiKeyProviderIds = apiKeyProviders.map(provider => provider.id).join("\0");
	const firstApiKeyProviderId = apiKeyProviders[0]?.id ?? "";
	const selectedProvider = providerId || apiKeyProviders[0]?.id || "";

	useEffect(() => {
		if (!firstApiKeyProviderId) {
			if (providerId) setProviderId("");
			return;
		}
		const selectedStillExists = apiKeyProviderIds.split("\0").includes(providerId);
		if (!providerId || !selectedStillExists) setProviderId(firstApiKeyProviderId);
	}, [apiKeyProviderIds, firstApiKeyProviderId, providerId]);

	return { apiKeyProviders, apiKey, selectedProvider, setApiKey, setProviderId };
}

export function EngineConnectionsPane({
	snapshot,
	loading = false,
	error,
	onRefresh,
	onProviderApiKeySubmit,
	onPinAccount,
	onSetAccountPolicy,
	onSetAccountPriorityOrder,
	onProviderLogout,
	configCatalog,
	configSnapshot,
	configLoading = false,
	onConfigValueChange,
	onConfigValueReset,
}: EngineConnectionsPaneProps) {
	const providers = snapshot?.providers ?? [];
	const apiKeySelection = useApiKeyProviderSelection(providers);

	return (
		<div>
			<EngineConnectionsHeader loading={loading} onRefresh={onRefresh} />
			{error && <SettingsErrorBanner error={error} />}
			<ProviderAccountsSettingsGroup
				providers={providers}
				loading={loading}
				onPinAccount={onPinAccount}
				onSetAccountPolicy={onSetAccountPolicy}
				onSetAccountPriorityOrder={onSetAccountPriorityOrder}
			/>
			<ProviderSettingsGroup providers={providers} loading={loading} onProviderLogout={onProviderLogout} />
			<ApiKeySettingsGroup
				selection={apiKeySelection}
				loading={loading}
				onProviderApiKeySubmit={onProviderApiKeySubmit}
			/>
			<ProviderPreferencesPane
				configCatalog={configCatalog}
				configSnapshot={configSnapshot}
				configLoading={configLoading}
				onConfigValueChange={onConfigValueChange}
				onConfigValueReset={onConfigValueReset}
			/>
		</div>
	);
}

function EngineConnectionsHeader({
	loading,
	onRefresh,
}: {
	readonly loading: boolean;
	readonly onRefresh?: () => void;
}) {
	return (
		<div className="mb-5 flex items-start gap-3">
			<div className="min-w-0 flex-1">
				<SettingsTitle>Connections</SettingsTitle>
				<SettingsSub>Provider auth managed by engine resources.</SettingsSub>
			</div>
			<button
				type="button"
				className="rounded-lg border border-fr-border bg-fr-surface px-3 py-1.5 text-fr-sm text-fr-text-2 hover:text-fr-text"
				disabled={loading}
				onClick={onRefresh}
			>
				{loading ? "Refreshing" : "Refresh"}
			</button>
		</div>
	);
}

function SettingsErrorBanner({ error }: { readonly error: string }) {
	return (
		<div className="mb-4 rounded-lg border border-fr-del bg-fr-del-bg px-3 py-2 text-fr-sm text-fr-del">{error}</div>
	);
}

function ProviderSettingsGroup({
	providers,
	loading,
	onProviderLogout,
}: {
	readonly providers: readonly EngineProviderRecord[];
	readonly loading: boolean;
	readonly onProviderLogout?: (providerId: string) => void;
}) {
	return (
		<SettingsGroup heading="Providers">
			{providers.map(provider => (
				<ProviderSettingsRow key={provider.id} provider={provider} onProviderLogout={onProviderLogout} />
			))}
			{providers.length === 0 && loading && <ProviderSettingsSkeleton />}
			{providers.length === 0 && !loading && (
				<SettingsRow name="No providers" desc="Refresh engine resources after the engine starts" />
			)}
		</SettingsGroup>
	);
}

function ProviderSettingsSkeleton() {
	return (
		<SkeletonGroup label="Loading providers…" className="flex flex-col gap-3 py-2">
			{[0, 1, 2].map(i => (
				<div key={i} className="flex items-center justify-between gap-3">
					<div className="min-w-0 flex-1">
						<Skeleton h={12} rounded="sm" w="30%" className="mb-1.5" />
						<Skeleton h={9} rounded="sm" w="56%" />
					</div>
					<Skeleton h={28} w={64} rounded="md" className="shrink-0" />
				</div>
			))}
		</SkeletonGroup>
	);
}

function ProviderSettingsRow({
	provider,
	onProviderLogout,
}: {
	readonly provider: EngineProviderRecord;
	readonly onProviderLogout?: (providerId: string) => void;
}) {
	return (
		<SettingsRow name={provider.name} desc={providerStatus(provider)}>
			{provider.authType !== "none" && provider.hasAuth && (
				<button
					type="button"
					className="rounded-lg border border-fr-border bg-fr-surface px-3 py-1.5 text-fr-sm text-fr-text-2 hover:text-fr-text"
					onClick={() => onProviderLogout?.(provider.id)}
				>
					Log out
				</button>
			)}
		</SettingsRow>
	);
}

function ApiKeySettingsGroup({
	selection,
	loading,
	onProviderApiKeySubmit,
}: {
	readonly selection: ReturnType<typeof useApiKeyProviderSelection>;
	readonly loading: boolean;
	readonly onProviderApiKeySubmit?: (providerId: string, apiKey: string) => void;
}) {
	return (
		<SettingsGroup heading="API key">
			<ApiKeyProviderRow selection={selection} loading={loading} />
			<ApiKeyValueRow selection={selection} loading={loading} onProviderApiKeySubmit={onProviderApiKeySubmit} />
		</SettingsGroup>
	);
}

function ApiKeyProviderRow({
	selection,
	loading,
}: {
	readonly selection: ReturnType<typeof useApiKeyProviderSelection>;
	readonly loading: boolean;
}) {
	return (
		<SettingsRow name="Provider" desc="Stored by the engine credential store">
			<select
				className="w-[220px] shrink-0 rounded-lg border border-fr-border bg-fr-surface px-2.5 py-2 font-secondary text-fr-sm text-fr-text"
				value={selection.selectedProvider}
				disabled={loading || selection.apiKeyProviders.length === 0}
				onChange={event => selection.setProviderId(event.target.value)}
			>
				{selection.apiKeyProviders.map(provider => (
					<option key={provider.id} value={provider.id}>
						{provider.name}
					</option>
				))}
			</select>
		</SettingsRow>
	);
}

function ApiKeyValueRow({
	selection,
	loading,
	onProviderApiKeySubmit,
}: {
	readonly selection: ReturnType<typeof useApiKeyProviderSelection>;
	readonly loading: boolean;
	readonly onProviderApiKeySubmit?: (providerId: string, apiKey: string) => void;
}) {
	const disabled = loading || !selection.selectedProvider;
	return (
		<SettingsRow name="API key">
			<Input
				type="password"
				className="w-[280px] shrink-0"
				value={selection.apiKey}
				disabled={disabled}
				onChange={event => selection.setApiKey(event.target.value)}
			/>
			<button
				type="button"
				className="rounded-lg border border-fr-border bg-fr-surface px-3 py-1.5 text-fr-sm text-fr-text-2 hover:text-fr-text"
				disabled={disabled || !selection.apiKey.trim()}
				onClick={() => {
					onProviderApiKeySubmit?.(selection.selectedProvider, selection.apiKey);
					selection.setApiKey("");
				}}
			>
				Save key
			</button>
		</SettingsRow>
	);
}
