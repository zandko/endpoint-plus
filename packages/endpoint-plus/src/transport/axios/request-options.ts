import type { AxiosRequestConfig } from 'axios';
import type { EndpointRequestConfig, InternalEndpointRequestConfig } from '../../types';
import { serializeRequestBody } from '../../shared/payload-codec';
import { resolveRequestTimeout } from '../../shared/request-timeout';

export function toAxiosRequestConfig(config: InternalEndpointRequestConfig): AxiosRequestConfig {
  return {
    baseURL: config.baseURL,
    data: serializeRequestBody(config),
    headers: config.headers,
    method: config.method,
    params: config.params,
    paramsSerializer: config.paramsSerializer
      ? { serialize: (params) => config.paramsSerializer?.(params, config) ?? '' }
      : undefined,
    onDownloadProgress: config.onDownloadProgress,
    onUploadProgress: config.onUploadProgress,
    responseType: toAxiosResponseType(config.responseType),
    signal: config.signal ?? undefined,
    timeout: resolveRequestTimeout(config.timeout),
    url: config.url,
  };
}

function toAxiosResponseType(
  responseType: EndpointRequestConfig['responseType'],
): AxiosRequestConfig['responseType'] {
  return responseType === 'arrayBuffer' || responseType === 'arraybuffer'
    ? 'arraybuffer'
    : (responseType as AxiosRequestConfig['responseType']);
}
