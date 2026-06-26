export interface DevtoolsRouteRecord {
  id: string;
  method: string;
  template: string;
  status: 'resolved' | 'unresolved';
  source?: 'source';
  samples: string[];
  responseTypeName: string;
  updatedAt: number;
  file?: string;
  line?: number;
  column?: number;
  lastResponseSample?: unknown;
}

export interface DevtoolsRouteManifestEntry {
  id: string;
  method: string;
  template: string;
  responseTypeName: string;
  file: string;
  line: number;
  column: number;
}

export interface DevtoolsRouteManifest {
  routes: DevtoolsRouteManifestEntry[];
  updatedAt: number;
}

export interface DevtoolsConfig {
  typegen: {
    outputFile: string;
  };
}

// ---------------------------------------------------------------------------
// Type generation — preview (server round-trip, quicktype-powered)
// ---------------------------------------------------------------------------

export interface DevtoolsTypegenPreviewRequest {
  responseTypeName: string;
  /** The raw JSON response sample. Arrays are handled correctly. */
  responseSample: unknown;
}

export interface DevtoolsTypegenPreviewResult {
  responseTypeName: string;
  /** The full type declarations block, exactly as it would appear in the saved file. */
  declarations: string;
  /** The root type name to display / reference (may be a type alias or interface name). */
  rootTypeName: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Type generation — save
// ---------------------------------------------------------------------------

export interface DevtoolsTypegenSaveRequest {
  routeKey: string;
  responseTypeName: string;
  overwrite?: boolean;
  responseSample?: unknown;
}

export interface DevtoolsTypegenSaveResult {
  routeKey: string;
  file: string;
  relativeFile: string;
  action: 'created' | 'added' | 'updated';
  ok: boolean;
  requiresConfirmation?: boolean;
  message: string;
}

export interface DevtoolsResponseCapturedPayload {
  method: string;
  url: string;
  responseSample: unknown;
}

// ---------------------------------------------------------------------------
// Bridge message union
// ---------------------------------------------------------------------------

export type DevtoolsBridgeEvent =
  | typeof import('../constants/protocol').DEVTOOLS_CONFIG
  | typeof import('../constants/protocol').DEVTOOLS_ROUTE_MANIFEST
  | typeof import('../constants/protocol').DEVTOOLS_TYPEGEN_PREVIEW
  | typeof import('../constants/protocol').DEVTOOLS_TYPEGEN_PREVIEW_RESULT
  | typeof import('../constants/protocol').DEVTOOLS_TYPEGEN_SAVE
  | typeof import('../constants/protocol').DEVTOOLS_TYPEGEN_SAVED
  | typeof import('../constants/protocol').DEVTOOLS_TYPEGEN_OPEN
  | typeof import('../constants/protocol').DEVTOOLS_PANEL_READY
  | typeof import('../constants/protocol').DEVTOOLS_RESPONSE_CAPTURED;

export interface DevtoolsBridgeMessage<TPayload = unknown> {
  source: typeof import('../constants/protocol').DEVTOOLS_WINDOW_MESSAGE_SOURCE;
  event: DevtoolsBridgeEvent;
  payload?: TPayload;
}
