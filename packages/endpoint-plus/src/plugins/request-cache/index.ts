export { createRequestCachePlugin } from './plugin';
export { MemoryRequestCacheStore } from './memory-store';
export { REQUEST_CACHE_PLUGIN } from '../constants';
export type {
  RequestCacheDedupeMode,
  RequestCacheKeyResolver,
  RequestCachePluginOptions,
  RequestCacheRequestOptions,
  RequestCacheStore,
} from './types';
export type { EndpointPlugin, EndpointPluginClient } from '../../types';
