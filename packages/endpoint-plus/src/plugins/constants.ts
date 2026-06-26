import type { EndpointPluginId } from '../types';

export const AUTH_TOKEN_PLUGIN: EndpointPluginId = Symbol.for('endpoint-plus/auth-token');
export const REFRESH_TOKEN_PLUGIN: EndpointPluginId = Symbol.for('endpoint-plus/refresh-token');
export const RETRY_PLUGIN: EndpointPluginId = Symbol.for('endpoint-plus/retry');

export const OBSERVABILITY_PLUGIN: EndpointPluginId = Symbol.for('endpoint-plus/observability');
export const REQUEST_CACHE_PLUGIN: EndpointPluginId = Symbol.for('endpoint-plus/request-cache');
export const REQUEST_GATE_PLUGIN: EndpointPluginId = Symbol.for('endpoint-plus/request-gate');
export const TYPEGEN_PLUGIN: EndpointPluginId = Symbol.for('endpoint-plus/typegen');
