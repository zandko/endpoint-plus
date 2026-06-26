import type { AxiosResponse } from 'axios';
import { isFunction } from 'es-toolkit';
import type { EndpointTransportResponse, InternalEndpointRequestConfig } from '../../types';
import { normalizeHeaderRecord } from '../../shared/header-records';
import { deserializeResponseData } from '../../shared/payload-codec';

export function toAxiosTransportResponse(
  response: AxiosResponse,
  config: InternalEndpointRequestConfig,
): EndpointTransportResponse {
  return {
    config,
    data: deserializeResponseData(response.data, { ...response, config }),
    headers: normalizeAxiosHeaders(response.headers),
    request: response.request,
    status: response.status,
    statusText: response.statusText,
  };
}

function normalizeAxiosHeaders(
  headers: AxiosResponse['headers'] | undefined,
): Record<string, string> {
  if (!headers) {
    return {};
  }

  const value = isFunction(headers.toJSON) ? headers.toJSON() : headers;
  return normalizeHeaderRecord(value as Record<string, unknown>);
}
