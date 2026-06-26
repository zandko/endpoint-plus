import type { FetchOptions, ResponseType } from 'ofetch';
import type { EndpointRequestConfig, InternalEndpointRequestConfig } from '../../types';
import { serializeRequestBody } from '../../shared/payload-codec';
import { buildRequestUrl } from '../../shared/request-url';
import { normalizeFetchHeaders } from './headers';

export interface OfetchRequest {
  options: FetchOptions;
  url: string;
}

export function toOfetchRequest(config: InternalEndpointRequestConfig): OfetchRequest {
  return {
    options: toOfetchRequestOptions(config),
    url: buildRequestUrl(config),
  };
}

function toOfetchRequestOptions(config: InternalEndpointRequestConfig): FetchOptions {
  const {
    bodySerializer: _bodySerializer,
    context: _context,
    data: _data,
    extensions: _extensions,
    headers: _headers,
    headerPrefix: _headerPrefix,
    method: _method,
    onDownloadProgress: _onDownloadProgress,
    onUploadProgress: _onUploadProgress,
    params: _params,
    paramsSerializer: _paramsSerializer,
    requireAuth: _requireAuth,
    responseDeserializer: _responseDeserializer,
    responseType: _responseType,
    returnMode: _returnMode,
    setAuthorizationHeader: _setAuthorizationHeader,
    url: _url,
    ...ofetchOptions
  } = config;

  return {
    ...ofetchOptions,
    body: serializeRequestBody(config) as BodyInit | Record<string, unknown> | undefined,
    headers: normalizeFetchHeaders(config.headers),
    method: config.method,
    responseType: toOfetchResponseType(config.responseType),
    signal: config.signal,
    timeout: config.timeout,
  } satisfies FetchOptions;
}

function toOfetchResponseType(
  responseType: EndpointRequestConfig['responseType'],
): ResponseType | undefined {
  return responseType === 'arraybuffer' ? 'arrayBuffer' : responseType;
}
