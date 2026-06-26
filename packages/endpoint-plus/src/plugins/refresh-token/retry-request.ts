import { isString } from 'es-toolkit';
import type { InternalEndpointRequestConfig } from '../../types';
import { cloneRequestConfig } from '../../shared/request-error-context';
import type { RefreshTokenPluginOptions } from './types';

export function createRefreshRetryRequest<TResult, TBody>(
  request: InternalEndpointRequestConfig,
  accessToken: string | null,
  options: RefreshTokenPluginOptions<TResult, TBody>,
): InternalEndpointRequestConfig {
  const retryRequest = cloneRequestConfig(request);
  retryRequest.context = retryRequest.context ?? {};
  retryRequest.context.isRefreshTokenRetry = true;

  if (!accessToken) {
    return retryRequest;
  }

  const headerName = options.headerName ?? 'Authorization';
  const headerPrefix = options.headerPrefix ?? retryRequest.headerPrefix ?? 'Bearer ';
  retryRequest.headers[headerName] =
    isString(accessToken) && accessToken.startsWith(headerPrefix)
      ? accessToken
      : `${headerPrefix}${accessToken}`;

  return retryRequest;
}
