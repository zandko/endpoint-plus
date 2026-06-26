import { isFunction, isString } from 'es-toolkit';
import { hash } from 'ohash';
import type { InternalEndpointRequestConfig } from '../../types';
import type { RequestGateKeyResolver } from './types';

export function createRequestGateKey(
  config: InternalEndpointRequestConfig,
  resolver: RequestGateKeyResolver | undefined,
): string {
  if (isString(resolver)) {
    return resolver;
  }

  if (isFunction(resolver)) {
    return resolver(config);
  }

  return hash({
    baseURL: config.baseURL,
    data: getSafeDataForHash(config.data),
    method: config.method,
    params: config.params,
    url: config.url,
  });
}

function getSafeDataForHash(data: unknown): unknown {
  if (!data) return data;

  // Safe checks for browser/Node.js specific types that shouldn't be fully hashed
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return '[Binary:FormData]';
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return `[Binary:Blob:${data.size}:${data.type}]`;
  }
  if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
    return `[Binary:ArrayBuffer:${data.byteLength}]`;
  }
  if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
    return data.toString();
  }

  return data;
}
