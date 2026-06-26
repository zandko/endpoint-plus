import { isNil, isPlainObject } from 'es-toolkit';
import type { InternalEndpointRequestConfig } from '../types';

export function serializeRequestBody(config: InternalEndpointRequestConfig): unknown {
  if (isNil(config.data) || !config.bodySerializer) {
    return config.data;
  }

  return config.bodySerializer(config.data, config);
}

export function deserializeResponseData(data: unknown, response: unknown): unknown {
  const config = getResponseConfig(response);
  return config?.responseDeserializer ? config.responseDeserializer(data, response) : data;
}

function getResponseConfig(response: unknown): InternalEndpointRequestConfig | undefined {
  if (!isPlainObject(response) || !('config' in response)) {
    return undefined;
  }

  return response.config as InternalEndpointRequestConfig;
}
