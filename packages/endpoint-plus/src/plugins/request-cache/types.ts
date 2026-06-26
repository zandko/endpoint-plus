import type {
  EndpointMethod,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
} from '../../types';

declare global {
  namespace YwEndpoint {
    interface RequestExtensions {
      requestCache?: false | RequestCacheRequestOptions;
    }
  }
}

export type RequestCacheDedupeMode = false | 'in-flight';
export type RequestCacheKeyResolver = string | ((config: InternalEndpointRequestConfig) => string);

export interface CachedEndpointResponse {
  expiresAt: number;
  response: EndpointTransportResponse;
}

export interface RequestCacheStore {
  clear(): void;
  delete(key: string): void;
  get(key: string): CachedEndpointResponse | undefined;
  set(key: string, value: CachedEndpointResponse): void;
}

export interface RequestCachePluginOptions {
  dedupe?: RequestCacheDedupeMode;
  key?: (config: InternalEndpointRequestConfig) => string;
  methods?: EndpointMethod[];
  shouldCache?: (config: InternalEndpointRequestConfig) => boolean;
  store?: RequestCacheStore;
  ttl?: number;
  varyByHeaders?: string[];
}

export interface RequestCacheRequestOptions {
  dedupe?: RequestCacheDedupeMode;
  key?: RequestCacheKeyResolver;
  ttl?: number;
}
