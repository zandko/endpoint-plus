import { isError, isPlainObject } from 'es-toolkit';
import type { EndpointTransportResponse, InternalEndpointRequestConfig } from '../types';

export function cloneRequestConfig(
  config: InternalEndpointRequestConfig,
): InternalEndpointRequestConfig {
  return {
    ...config,
    headers: { ...config.headers },
    context: { ...config.context },
  };
}

export function getRequestConfig(error: unknown): InternalEndpointRequestConfig | undefined {
  const response = getErrorResponse(error);
  if (response?.config) {
    return response.config;
  }

  return isRecordLike(error) && 'config' in error
    ? (error.config as InternalEndpointRequestConfig)
    : undefined;
}

export function getErrorResponse(error: unknown): EndpointTransportResponse | undefined {
  return isRecordLike(error) && 'response' in error
    ? (error.response as EndpointTransportResponse)
    : undefined;
}

function isRecordLike(value: unknown): value is Record<PropertyKey, unknown> {
  return isPlainObject(value) || isError(value);
}
