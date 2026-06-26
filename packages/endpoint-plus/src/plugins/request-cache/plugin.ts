import type {
  EndpointPlugin,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
} from '../../types';
import { REQUEST_CACHE_PLUGIN } from '../constants';
import { cloneTransportResponse } from '../../shared/transport-response';
import { createRequestCacheKey } from './cache-key';
import { MemoryRequestCacheStore } from './memory-store';
import type { RequestCachePluginOptions, RequestCacheRequestOptions } from './types';

const defaultMethods = ['GET', 'HEAD'];
const defaultTtl = 30_000;

export function createRequestCachePlugin(options: RequestCachePluginOptions = {}): EndpointPlugin {
  const store = options.store ?? new MemoryRequestCacheStore();
  const inflight = new Map<string, Promise<EndpointTransportResponse>>();
  const methods = new Set(options.methods ?? defaultMethods);

  return {
    id: REQUEST_CACHE_PLUGIN,
    kind: 'plugin',
    setup(client) {
      client.registerRequestMiddleware(async (config, next) => {
        if (!shouldHandleRequest(config, methods, options)) {
          return next(config);
        }

        const requestOptions = getRequestCacheOptions(config);
        const key = createRequestCacheKey(
          config,
          requestOptions?.key ?? options.key,
          options.varyByHeaders,
        );
        const cached = store.get(key);

        if (cached) {
          return cloneTransportResponse(cached.response, config);
        }

        const dedupeMode = requestOptions?.dedupe ?? options.dedupe ?? 'in-flight';
        const pending = inflight.get(key);

        if (dedupeMode === 'in-flight' && pending) {
          const response = await pending;
          return cloneTransportResponse(response, config);
        }

        const request = next(config);
        if (dedupeMode === 'in-flight') {
          inflight.set(key, request);
        }

        try {
          const response = await request;
          store.set(key, {
            expiresAt: Date.now() + (requestOptions?.ttl ?? options.ttl ?? defaultTtl),
            response: cloneTransportResponse(response, response.config),
          });
          return response;
        } finally {
          inflight.delete(key);
        }
      });
    },
  };
}

function shouldHandleRequest(
  config: InternalEndpointRequestConfig,
  methods: Set<string>,
  options: RequestCachePluginOptions,
): boolean {
  if (config.extensions?.requestCache === false) {
    return false;
  }

  if (!methods.has(String(config.method).toUpperCase())) {
    return false;
  }

  return options.shouldCache?.(config) ?? true;
}

function getRequestCacheOptions(
  config: InternalEndpointRequestConfig,
): RequestCacheRequestOptions | undefined {
  const requestOptions = config.extensions?.requestCache;
  return requestOptions === false ? undefined : requestOptions;
}
