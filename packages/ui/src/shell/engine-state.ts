import type {
	EngineConfigCatalog,
	EngineConfigDriver,
	EngineConfigSnapshot,
	EngineModelInsightsResult,
	EngineResourceDriver,
	EngineResourceSettingsSnapshot,
	EngineResourceSnapshot,
	WorkspaceRef,
} from "@fraym/driver";
import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	ENGINE_CONFIG_NOT_CONNECTED_ERROR,
	ENGINE_RESOURCES_NOT_CONNECTED_ERROR,
	messageFromError,
} from "./engine-errors";


export interface EngineResourceState {
	readonly snapshot: EngineResourceSnapshot | null;
	readonly loading: boolean;
	readonly error: string | null;
	/** Deterministic benchmark/usage feed (`_fraym/models/insights`), keyed
	 *  `providerId/modelId`. Null while loading or when the engine lacks the lane. */
	readonly insights: EngineModelInsightsResult | null;
	readonly refresh: () => Promise<void>;
	readonly setDefaultModel: (selection: { readonly provider: string; readonly modelId: string }) => void;
	readonly setDefaultThinkingLevel: (
		level: NonNullable<EngineResourceSettingsSnapshot["defaultThinkingLevel"]>,
	) => void;
	readonly setEnableSkillCommands: (enabled: boolean) => void;
	readonly setScopedModelPatterns: (patterns: readonly string[]) => void;
	readonly setExtensionEnabled: (filePath: string, enabled: boolean) => void;
	readonly setSkillEnabled: (filePath: string, enabled: boolean) => void;
	readonly setMcpServerEnabled: (name: string, enabled: boolean) => void;
}

export interface EngineConfigState {
	readonly catalog: EngineConfigCatalog | null;
	readonly snapshot: EngineConfigSnapshot | null;
	readonly loading: boolean;
	readonly error: string | null;
	readonly refresh: () => Promise<void>;
	readonly setConfigValue: (path: string, value: unknown) => Promise<void>;
	readonly resetConfigValue: (path: string) => Promise<void>;
}

type StateSetter<T> = Dispatch<SetStateAction<T>>;
type MountedRef = MutableRefObject<boolean>;
type RequestVersionRef = MutableRefObject<number>;
type RequestGuard = () => boolean;
type ResourceMutation = (
	driver: EngineResourceDriver,
	activeWorkspace: WorkspaceRef,
) => Promise<EngineResourceSnapshot>;
type ConfigMutation = (driver: EngineConfigDriver, activeWorkspace: WorkspaceRef) => Promise<EngineConfigSnapshot>;

interface RequestScope {
	readonly mountedRef: MountedRef;
	readonly requestVersionRef: RequestVersionRef;
	readonly setError: StateSetter<string | null>;
	readonly setLoading: StateSetter<boolean>;
}

interface ResourceLoadOptions extends RequestScope {
	readonly refresh: boolean;
	readonly resourceDriver: EngineResourceDriver | null | undefined;
	readonly setSnapshot: StateSetter<EngineResourceSnapshot | null>;
	readonly workspace: WorkspaceRef | null | undefined;
}

interface ResourceMutationOptions extends RequestScope {
	readonly mutate: ResourceMutation;
	readonly resourceDriver: EngineResourceDriver | null | undefined;
	readonly setSnapshot: StateSetter<EngineResourceSnapshot | null>;
	readonly workspace: WorkspaceRef | null | undefined;
}

interface ConfigLoadOptions extends RequestScope {
	readonly configDriver: EngineConfigDriver | null | undefined;
	readonly setCatalog: StateSetter<EngineConfigCatalog | null>;
	readonly setSnapshot: StateSetter<EngineConfigSnapshot | null>;
	readonly workspace: WorkspaceRef | null | undefined;
}

interface ConfigMutationOptions extends RequestScope {
	readonly configDriver: EngineConfigDriver | null | undefined;
	readonly mutate: ConfigMutation;
	readonly setSnapshot: StateSetter<EngineConfigSnapshot | null>;
	readonly workspace: WorkspaceRef | null | undefined;
}

function useMountedRef(): MountedRef {
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	return mountedRef;
}

function beginLatestRequest(requestVersionRef: RequestVersionRef, mountedRef: MountedRef): RequestGuard {
	const requestVersion = ++requestVersionRef.current;
	return () => mountedRef.current && requestVersion === requestVersionRef.current;
}

function resetResourceSnapshot(options: ResourceLoadOptions): void {
	options.setSnapshot(null);
	options.setError(null);
	options.setLoading(false);
}

function resetConfigSnapshot(options: ConfigLoadOptions): void {
	options.setCatalog(null);
	options.setSnapshot(null);
	options.setError(null);
	options.setLoading(false);
}

async function loadEngineResourceSnapshot(options: ResourceLoadOptions): Promise<void> {
	const { mountedRef, refresh, requestVersionRef, resourceDriver, setError, setLoading, setSnapshot, workspace } =
		options;
	const isCurrent = beginLatestRequest(requestVersionRef, mountedRef);
	if (!resourceDriver || !workspace) {
		resetResourceSnapshot(options);
		return;
	}
	setLoading(true);
	try {
		const next = refresh
			? await resourceDriver.refreshResources(workspace)
			: await resourceDriver.getResourceSnapshot(workspace);
		if (!isCurrent()) return;
		setSnapshot(next);
		setError(null);
	} catch (nextError) {
		if (!isCurrent()) return;
		setError(messageFromError(nextError));
	} finally {
		if (isCurrent()) setLoading(false);
	}
}

export async function mutateEngineResourceSnapshot(options: ResourceMutationOptions): Promise<void> {
	const { mountedRef, mutate, requestVersionRef, resourceDriver, setError, setLoading, setSnapshot, workspace } =
		options;
	const isCurrent = beginLatestRequest(requestVersionRef, mountedRef);
	if (!resourceDriver || !workspace) {
		setError(ENGINE_RESOURCES_NOT_CONNECTED_ERROR);
		return;
	}
	setLoading(true);
	try {
		const next = await mutate(resourceDriver, workspace);
		// A completed mutation returns the authoritative resource snapshot.
		// Apply it through the shared path so delayed loads cannot overwrite it.
		applyResourceSnapshot(next, { mountedRef, requestVersionRef, setError, setLoading, setSnapshot });
	} catch (nextError) {
		if (!isCurrent()) return;
		setError(messageFromError(nextError));
	} finally {
		if (isCurrent()) setLoading(false);
	}
}

async function loadEngineConfigSnapshot(options: ConfigLoadOptions): Promise<void> {
	const { configDriver, mountedRef, requestVersionRef, setCatalog, setError, setLoading, setSnapshot, workspace } =
		options;
	const isCurrent = beginLatestRequest(requestVersionRef, mountedRef);
	if (!configDriver || !workspace) {
		resetConfigSnapshot(options);
		return;
	}
	setLoading(true);
	try {
		const [nextCatalog, nextSnapshot] = await Promise.all([
			configDriver.getConfigCatalog(workspace),
			configDriver.getConfigSnapshot(workspace),
		]);
		if (!isCurrent()) return;
		setCatalog(nextCatalog);
		setSnapshot(nextSnapshot);
		setError(null);
	} catch (nextError) {
		if (!isCurrent()) return;
		setError(messageFromError(nextError));
	} finally {
		if (isCurrent()) setLoading(false);
	}
}

async function mutateEngineConfigSnapshot(options: ConfigMutationOptions): Promise<void> {
	const { configDriver, mountedRef, mutate, requestVersionRef, setError, setLoading, setSnapshot, workspace } =
		options;
	const isCurrent = beginLatestRequest(requestVersionRef, mountedRef);
	if (!configDriver || !workspace) {
		setError(ENGINE_CONFIG_NOT_CONNECTED_ERROR);
		return;
	}
	setLoading(true);
	try {
		const next = await mutate(configDriver, workspace);
		if (!isCurrent()) return;
		setSnapshot(next);
		setError(null);
	} catch (nextError) {
		if (!isCurrent()) return;
		setError(messageFromError(nextError));
	} finally {
		if (isCurrent()) setLoading(false);
	}
}

function applyResourceSnapshot(
	next: EngineResourceSnapshot,
	options: Pick<ResourceLoadOptions, "mountedRef" | "requestVersionRef" | "setError" | "setLoading" | "setSnapshot">,
): void {
	options.requestVersionRef.current += 1;
	if (!options.mountedRef.current) return;
	options.setSnapshot(next);
	options.setError(null);
	options.setLoading(false);
}

interface EngineResourceStateOptions {
	readonly error: string | null;
	readonly loading: boolean;
	readonly mutateSnapshot: (mutate: ResourceMutation) => Promise<void>;
	readonly applySnapshot: (next: EngineResourceSnapshot) => void;
	readonly refreshSnapshot: () => Promise<void>;
	readonly resourceDriver: EngineResourceDriver | null | undefined;
	readonly snapshot: EngineResourceSnapshot | null;
	readonly insights: EngineModelInsightsResult | null;
	readonly workspace: WorkspaceRef | null | undefined;
}


function createEngineResourceState(options: EngineResourceStateOptions): EngineResourceState {
	const {
		applySnapshot,
		error,
		loading,
		mutateSnapshot,
		refreshSnapshot,
		resourceDriver,
		insights,
		snapshot,
		workspace,
	} = options;

	return {
		snapshot,
		insights,
		loading,
		error: resourceDriver && workspace ? error : ENGINE_RESOURCES_NOT_CONNECTED_ERROR,
		refresh: refreshSnapshot,
		setDefaultModel: selection => {
			mutateSnapshot((driver, activeWorkspace) => driver.setDefaultModel(activeWorkspace, selection));
		},
		setDefaultThinkingLevel: level => {
			mutateSnapshot((driver, activeWorkspace) => driver.setDefaultThinkingLevel(activeWorkspace, level));
		},
		setEnableSkillCommands: enabled => {
			mutateSnapshot((driver, activeWorkspace) => driver.setEnableSkillCommands(activeWorkspace, enabled));
		},
		setScopedModelPatterns: patterns => {
			mutateSnapshot((driver, activeWorkspace) => driver.setScopedModelPatterns(activeWorkspace, patterns));
		},
		setExtensionEnabled: (filePath, enabled) => {
			mutateSnapshot((driver, activeWorkspace) => driver.setExtensionEnabled(activeWorkspace, filePath, enabled));
		},
		setSkillEnabled: (filePath, enabled) => {
			mutateSnapshot((driver, activeWorkspace) => driver.setSkillEnabled(activeWorkspace, filePath, enabled));
		},
		setMcpServerEnabled: (name, enabled) => {
			// Optimistic flip: the engine snapshot round-trip can take several seconds and the
			// switch is controlled, so without this the toggle looks dead until the engine
			// replies. Apply locally now; mutateSnapshot's authoritative result reconciles.
			const current = snapshot?.mcpServers.find(server => server.name === name);
			if (snapshot && current && current.enabled !== enabled) {
				applySnapshot({
					...snapshot,
					mcpServers: snapshot.mcpServers.map(server => (server.name === name ? { ...server, enabled } : server)),
				});
			}
			mutateSnapshot((driver, activeWorkspace) => driver.setMcpServerEnabled(activeWorkspace, name, enabled));
		},
	};
}

interface EngineConfigStateOptions {
	readonly catalog: EngineConfigCatalog | null;
	readonly configDriver: EngineConfigDriver | null | undefined;
	readonly error: string | null;
	readonly loading: boolean;
	readonly mutateSnapshot: (mutate: ConfigMutation) => Promise<void>;
	readonly refreshSnapshot: () => Promise<void>;
	readonly snapshot: EngineConfigSnapshot | null;
	readonly workspace: WorkspaceRef | null | undefined;
}

function createEngineConfigState(options: EngineConfigStateOptions): EngineConfigState {
	const { catalog, configDriver, error, loading, mutateSnapshot, refreshSnapshot, snapshot, workspace } = options;

	return {
		catalog,
		snapshot,
		loading,
		error: configDriver && workspace ? error : ENGINE_CONFIG_NOT_CONNECTED_ERROR,
		refresh: refreshSnapshot,
		setConfigValue: (path, value) =>
			mutateSnapshot((driver, activeWorkspace) => driver.setConfigValue(activeWorkspace, path, value)),
		resetConfigValue: path =>
			mutateSnapshot((driver, activeWorkspace) => driver.resetConfigValue(activeWorkspace, path)),
	};
}

export function useEngineResourceState(
	resourceDriver: EngineResourceDriver | null | undefined,
	workspace: WorkspaceRef | null | undefined,
): EngineResourceState {
	const [snapshot, setSnapshot] = useState<EngineResourceSnapshot | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const requestVersionRef = useRef(0);
	const mountedRef = useMountedRef();

	const loadSnapshot = useCallback(
		(refresh = false) => {
			return loadEngineResourceSnapshot({
				mountedRef,
				refresh,
				requestVersionRef,
				resourceDriver,
				setError,
				setLoading,
				setSnapshot,
				workspace,
			});
		},
		[resourceDriver, workspace, mountedRef],
	);

	useEffect(() => {
		void loadSnapshot(false);
	}, [loadSnapshot]);

	// Resource-lane sync: when the engine pushes `resourcesChanged` (an
	// out-of-band registry write — CLI, an agent's plugins/mcp tool in another
	// sidecar, a hand edit), refetch WITH refresh so the engine rebuilds its
	// snapshot instead of serving the cached one. Capability-gated — pull-only
	// drivers simply never push.
	useEffect(() => {
		if (!resourceDriver?.subscribeResourcesChanged) return undefined;
		return resourceDriver.subscribeResourcesChanged(() => {
			void loadSnapshot(true);
		});
	}, [resourceDriver, loadSnapshot]);

	// Insights are enhancement-only: fetched once per driver/workspace, never
	// blocking, and silently absent when the engine predates the lane (the
	// first fetch may take a beat while the engine hits its feed sources).
	const [insights, setInsights] = useState<EngineModelInsightsResult | null>(null);
	useEffect(() => {
		let alive = true;
		setInsights(null);
		const driver = resourceDriver;
		if (!driver?.getModelInsights || !workspace) return undefined;
		void driver
			.getModelInsights(workspace)
			.then(result => {
				if (alive) setInsights(result);
			})
			.catch(() => undefined);
		return () => {
			alive = false;
		};
	}, [resourceDriver, workspace]);

	const mutateSnapshot = useCallback(
		(mutate: ResourceMutation) => {
			return mutateEngineResourceSnapshot({
				mountedRef,
				mutate,
				requestVersionRef,
				resourceDriver,
				setError,
				setLoading,
				setSnapshot,
				workspace,
			});
		},
		[resourceDriver, workspace, mountedRef],
	);

	const applySnapshot = useCallback(
		(next: EngineResourceSnapshot) => {
			applyResourceSnapshot(next, { mountedRef, requestVersionRef, setError, setLoading, setSnapshot });
		},
		[mountedRef],
	);

	return createEngineResourceState({
		error,
		loading,
		applySnapshot,
		mutateSnapshot: mutate => mutateSnapshot(mutate),
		refreshSnapshot: () => loadSnapshot(true),
		resourceDriver,
		snapshot,
		insights,
		workspace,
	});
}

export function useEngineConfigState(
	configDriver: EngineConfigDriver | null | undefined,
	workspace: WorkspaceRef | null | undefined,
): EngineConfigState {
	const [catalog, setCatalog] = useState<EngineConfigCatalog | null>(null);
	const [snapshot, setSnapshot] = useState<EngineConfigSnapshot | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const requestVersionRef = useRef(0);
	const mountedRef = useMountedRef();

	const loadSnapshot = useCallback(async () => {
		return loadEngineConfigSnapshot({
			configDriver,
			mountedRef,
			requestVersionRef,
			setCatalog,
			setError,
			setLoading,
			setSnapshot,
			workspace,
		});
	}, [configDriver, workspace, mountedRef]);

	useEffect(() => {
		void loadSnapshot();
	}, [loadSnapshot]);

	// Config-lane sync: when the engine pushes `configChanged`
	// (another client, the TUI, or a hand edit wrote the drawer), refetch the
	// snapshot. Capability-gated — pull-only drivers simply never push.
	useEffect(() => {
		if (!configDriver?.subscribeConfigChanges) return undefined;
		return configDriver.subscribeConfigChanges(() => {
			void loadSnapshot();
		});
	}, [configDriver, loadSnapshot]);

	const mutateSnapshot = useCallback(
		(mutate: ConfigMutation) => {
			return mutateEngineConfigSnapshot({
				configDriver,
				mountedRef,
				mutate,
				requestVersionRef,
				setError,
				setLoading,
				setSnapshot,
				workspace,
			});
		},
		[configDriver, workspace, mountedRef],
	);

	return createEngineConfigState({
		catalog,
		configDriver,
		error,
		loading,
		mutateSnapshot: mutate => mutateSnapshot(mutate),
		refreshSnapshot: () => loadSnapshot(),
		snapshot,
		workspace,
	});
}
