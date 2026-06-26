import { isFunction } from 'es-toolkit';
import type { EndpointRequestConfig, InternalEndpointRequestConfig } from '../../types';
import type { RefreshTokenPluginOptions } from './types';

export function resolveRefreshRequest<TResult, TBody>(
  options: RefreshTokenPluginOptions<TResult, TBody>,
  context: {
    error: unknown;
    request: InternalEndpointRequestConfig;
  },
): Promise<EndpointRequestConfig<TBody, TResult>> | EndpointRequestConfig<TBody, TResult> {
  return isFunction(options.refreshRequest)
    ? options.refreshRequest(context)
    : options.refreshRequest;
}
