import { cloneDeep } from 'es-toolkit';
import { computed, ref, shallowRef, watch, toRaw } from 'vue';
import { useEventListener } from '@vueuse/core';
import type {
  DevtoolsBridgeMessage,
  DevtoolsConfig,
  DevtoolsResponseCapturedPayload,
  DevtoolsRouteManifest,
  DevtoolsRouteManifestEntry,
  DevtoolsRouteRecord,
  DevtoolsTypegenPreviewResult,
  DevtoolsTypegenSaveResult,
} from '../types/index.ts';
import {
  DEFAULT_TYPEGEN_OUTPUT_FILE,
  DEVTOOLS_CONFIG,
  DEVTOOLS_PANEL_READY,
  DEVTOOLS_RESPONSE_CAPTURED,
  DEVTOOLS_ROUTE_MANIFEST,
  DEVTOOLS_TYPEGEN_OPEN,
  DEVTOOLS_TYPEGEN_PREVIEW,
  DEVTOOLS_TYPEGEN_PREVIEW_RESULT,
  DEVTOOLS_TYPEGEN_SAVE,
  DEVTOOLS_TYPEGEN_SAVED,
  DEVTOOLS_WINDOW_MESSAGE_SOURCE,
} from '../constants/index.ts';
import { sendToHost } from '../utils/host.ts';

export type PanelTab = 'catalog' | 'typegen';

export function useStore() {
  const routes = ref<DevtoolsRouteRecord[]>([]);
  const devtoolsConfig = ref<DevtoolsConfig>({
    typegen: { outputFile: DEFAULT_TYPEGEN_OUTPUT_FILE },
  });
  const selectedRouteId = shallowRef('');
  const lastSaveResult = shallowRef<DevtoolsTypegenSaveResult>();
  const activeTab = shallowRef<PanelTab>('catalog');

  // ── Type preview state (server-driven via quicktype) ──────────────────────
  const typePreview = shallowRef<DevtoolsTypegenPreviewResult | undefined>();
  const isPreviewLoading = shallowRef(false);

  // ── HMR channel (devtools panel running inside Vite dev server) ───────────
  if (import.meta.hot) {
    import.meta.hot.on(DEVTOOLS_TYPEGEN_PREVIEW_RESULT, (result: DevtoolsTypegenPreviewResult) => {
      typePreview.value = result;
      isPreviewLoading.value = false;
    });
    import.meta.hot.on(DEVTOOLS_TYPEGEN_SAVED, (result: DevtoolsTypegenSaveResult) => {
      lastSaveResult.value = result;
    });
    import.meta.hot.on(DEVTOOLS_CONFIG, (config: DevtoolsConfig) => ingestConfig(config));
    import.meta.hot.on(DEVTOOLS_ROUTE_MANIFEST, (manifest: DevtoolsRouteManifest) =>
      ingestManifest(manifest),
    );
  }

  // ── postMessage bridge (devtools panel running in nested iframe) ──────────
  useEventListener(window, 'message', (message: MessageEvent) => {
    const data = message.data as DevtoolsBridgeMessage | undefined;
    if (!data || data.source !== DEVTOOLS_WINDOW_MESSAGE_SOURCE) return;

    switch (data.event) {
      case DEVTOOLS_TYPEGEN_PREVIEW_RESULT:
        typePreview.value = data.payload as DevtoolsTypegenPreviewResult;
        isPreviewLoading.value = false;
        break;
      case DEVTOOLS_TYPEGEN_SAVED:
        lastSaveResult.value = data.payload as DevtoolsTypegenSaveResult;
        break;
      case DEVTOOLS_CONFIG:
        ingestConfig(data.payload as DevtoolsConfig);
        break;
      case DEVTOOLS_ROUTE_MANIFEST:
        ingestManifest(data.payload as DevtoolsRouteManifest);
        break;
      case DEVTOOLS_RESPONSE_CAPTURED: {
        const payload = data.payload as DevtoolsResponseCapturedPayload;
        const matched = matchRouteByUrl(routes.value, payload.method, payload.url);
        if (matched) {
          matched.lastResponseSample = payload.responseSample;
          // If this is the selected route, refresh the preview immediately.
          if (matched.id === selectedRouteId.value) {
            requestPreview(matched);
          }
        }
        break;
      }
    }
  });

  sendToHost(DEVTOOLS_PANEL_READY);

  // ── Derived state ─────────────────────────────────────────────────────────
  const capturedRoutes = computed(() =>
    routes.value.filter((r) => r.lastResponseSample !== undefined),
  );

  const selectedRoute = computed(() => routes.value.find((r) => r.id === selectedRouteId.value));

  const stats = computed(() => ({
    total: routes.value.length,
    captured: capturedRoutes.value.length,
  }));

  // Request a fresh preview whenever the selected route changes.
  watch(selectedRoute, (route) => {
    typePreview.value = undefined;
    lastSaveResult.value = undefined;
    if (route?.lastResponseSample !== undefined) {
      requestPreview(route);
    }
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  function selectRoute(id: string): void {
    if (!routes.value.some((r) => r.id === id)) return;
    selectedRouteId.value = id;
  }

  function saveTypePreview(overwrite = false): void {
    const route = selectedRoute.value;
    if (!route || route.status !== 'resolved' || route.lastResponseSample === undefined) return;

    let responseSample: unknown;
    try {
      responseSample = cloneDeep(toRaw(route.lastResponseSample));
    } catch {
      responseSample = undefined;
    }

    sendToHost(DEVTOOLS_TYPEGEN_SAVE, {
      routeKey: `${route.method} ${route.template}`,
      responseTypeName: route.responseTypeName,
      overwrite,
      responseSample,
    });
  }

  function openGeneratedTypeFile(): void {
    const file = lastSaveResult.value?.file;
    if (file) sendToHost(DEVTOOLS_TYPEGEN_OPEN, file);
  }

  function setActiveTab(tab: string | number): void {
    if (tab !== 'catalog' && tab !== 'typegen') return;
    activeTab.value = tab;
    if (tab === 'typegen' && !selectedRoute.value?.lastResponseSample) {
      selectedRouteId.value = capturedRoutes.value[0]?.id ?? '';
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────────
  function requestPreview(route: DevtoolsRouteRecord): void {
    isPreviewLoading.value = true;
    sendToHost(DEVTOOLS_TYPEGEN_PREVIEW, {
      responseTypeName: route.responseTypeName,
      responseSample: toRaw(route.lastResponseSample),
    });
  }

  function ingestManifest(manifest: DevtoolsRouteManifest): void {
    routes.value = buildRoutesFromManifest(manifest.routes, routes.value);
    if (!routes.value.some((r) => r.id === selectedRouteId.value)) {
      selectedRouteId.value = routes.value[0]?.id ?? '';
    }
  }

  function ingestConfig(config: DevtoolsConfig): void {
    devtoolsConfig.value = config;
  }

  return {
    routes,
    capturedRoutes,
    activeTab,
    selectedRoute,
    stats,
    devtoolsConfig,
    typePreview,
    isPreviewLoading,
    lastSaveResult,
    selectRoute,
    saveTypePreview,
    openGeneratedTypeFile,
    setActiveTab,
  };
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function matchRouteByUrl(
  routes: DevtoolsRouteRecord[],
  method: string,
  url: string,
): DevtoolsRouteRecord | undefined {
  const urlSegments = url.split('/').filter(Boolean);
  return routes.find((route) => {
    if (route.method.toUpperCase() !== method.toUpperCase()) return false;
    const templateSegments = route.template.split('/').filter(Boolean);
    return (
      templateSegments.length === urlSegments.length &&
      templateSegments.every((seg, i) => seg.startsWith(':') || seg === urlSegments[i])
    );
  });
}

function buildRoutesFromManifest(
  entries: readonly DevtoolsRouteManifestEntry[],
  existing: readonly DevtoolsRouteRecord[],
): DevtoolsRouteRecord[] {
  const existingMap = new Map(existing.map((r) => [r.id, r]));
  return entries.map((entry) => ({
    id: entry.id,
    method: entry.method,
    template: entry.template,
    status: 'resolved' as const,
    source: 'source' as const,
    samples: [entry.template],
    responseTypeName: entry.responseTypeName,
    updatedAt: Date.now(),
    file: entry.file,
    line: entry.line,
    column: entry.column,
    lastResponseSample: existingMap.get(entry.id)?.lastResponseSample,
  }));
}
