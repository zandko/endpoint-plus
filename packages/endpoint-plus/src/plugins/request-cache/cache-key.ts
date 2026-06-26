import { isFunction, isString } from 'es-toolkit';
import { hash } from 'ohash';
import type { InternalEndpointRequestConfig } from '../../types';
import { getHeader } from '../../shared/header-records';
import type { RequestCacheKeyResolver } from './types';

const defaultVaryHeaders = ['authorization', 'accept-language'];

export function createRequestCacheKey(
  config: InternalEndpointRequestConfig,
  resolver?: RequestCacheKeyResolver,
  varyByHeaders: string[] = defaultVaryHeaders,
): string {
  if (isString(resolver)) {
    return resolver;
  }

  if (isFunction(resolver)) {
    return resolver(config);
  }

  return hash({
    baseURL: config.baseURL,
    data: config.data,
    headers: pickVaryHeaders(config, varyByHeaders),
    method: config.method,
    params: config.params,
    url: config.url,
  });
}

function pickVaryHeaders(
  config: InternalEndpointRequestConfig,
  varyByHeaders: string[],
): Record<string, string> {
  const selected: Record<string, string> = {};

  for (const header of varyByHeaders) {
    const value = getHeader(config.headers, header);
    if (value) {
      selected[header.toLowerCase()] = value;
    }
  }

  return selected;
}
