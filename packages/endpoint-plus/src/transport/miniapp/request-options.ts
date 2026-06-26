import type { EndpointRequestConfig, InternalEndpointRequestConfig } from '../../types';
import { serializeRequestBody } from '../../shared/payload-codec';
import { resolveRequestTimeout } from '../../shared/request-timeout';
import { buildRequestUrl } from '../../shared/request-url';
import type { MiniappRequestOptions, MiniappResponse } from './types';

export function toMiniappRequestOptions(
  config: InternalEndpointRequestConfig,
  handlers: Pick<MiniappRequestOptions, 'fail' | 'success'>,
): MiniappRequestOptions {
  return {
    data: serializeRequestBody(config),
    dataType: resolveDataType(config.responseType),
    fail: handlers.fail,
    header: config.headers,
    method: config.method,
    responseType: resolveResponseType(config.responseType),
    success: handlers.success as (response: MiniappResponse) => void,
    timeout: resolveRequestTimeout(config.timeout),
    url: buildRequestUrl(config),
  };
}

function resolveDataType(responseType: EndpointRequestConfig['responseType']): string | undefined {
  return responseType === 'json' ? 'json' : undefined;
}

function resolveResponseType(
  responseType: EndpointRequestConfig['responseType'],
): 'arraybuffer' | 'text' | undefined {
  if (responseType === 'arrayBuffer' || responseType === 'arraybuffer') {
    return 'arraybuffer';
  }

  return responseType === 'text' ? 'text' : undefined;
}
