import { isNil, isNotNil, isPlainObject, pickBy } from 'es-toolkit';
import { hasProtocol, parseQuery, withBase, withQuery } from 'ufo';
import type { EndpointRequestConfig, InternalEndpointRequestConfig } from '../types';

type QueryParams = NonNullable<Parameters<typeof withQuery>[1]>;

export function buildRequestUrl(config: InternalEndpointRequestConfig): string {
  const requestUrl = config.url ?? '';
  const target =
    config.baseURL && !hasProtocol(requestUrl, { acceptRelative: true })
      ? withBase(requestUrl, config.baseURL)
      : requestUrl;

  if (config.paramsSerializer && !isNil(config.params)) {
    const query = config.paramsSerializer(config.params, config).replace(/^\?/, '');
    return query ? withQuery(target, parseQuery(query)) : target;
  }

  const query = normalizeQueryParams(config.params);
  return query ? withQuery(target, query) : target;
}

function normalizeQueryParams(params: EndpointRequestConfig['params']): QueryParams | undefined {
  if (isNil(params)) {
    return undefined;
  }

  if (isSearchParams(params)) {
    return normalizeSearchParams(params);
  }

  if (!isPlainObject(params)) {
    return { value: String(params) } as QueryParams;
  }

  return pickBy(params, (value) => isNotNil(value)) as QueryParams;
}

function normalizeSearchParams(params: URLSearchParams): QueryParams {
  const query: Record<string, string | string[]> = {};

  params.forEach((value, key) => {
    const current = query[key];

    if (isNil(current)) {
      query[key] = value;
      return;
    }

    query[key] = Array.isArray(current) ? [...current, value] : [current, value];
  });

  return query as QueryParams;
}

function isSearchParams(params: unknown): params is URLSearchParams {
  return typeof URLSearchParams !== 'undefined' && params instanceof URLSearchParams;
}
