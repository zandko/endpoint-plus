import type { EndpointPlugin, EndpointTransportResponse } from '../../types';
import { REFRESH_TOKEN_PLUGIN } from '../constants';
import { createAbortError } from '../../errors/abort-error';
import { isRequestAborted } from '../../shared/request-abort';
import { getRequestConfig } from '../../shared/request-error-context';
import { resolveAccessToken } from './access-token';
import { resolveRefreshRequest } from './refresh-request';
import { shouldRefresh } from './refresh-policy';
import { createRefreshRetryRequest } from './retry-request';
import type { RefreshTokenPluginOptions } from './types';

export function createRefreshTokenPlugin<TResult = unknown, TBody = unknown>(
  options: RefreshTokenPluginOptions<TResult, TBody>,
): EndpointPlugin {
  let refreshPromise: Promise<TResult> | null = null;

  return {
    id: REFRESH_TOKEN_PLUGIN,
    kind: 'plugin',
    setup(client) {
      client.registerResponseInterceptor(undefined, async (error) => {
        const request = getRequestConfig(error);
        if (
          !request ||
          request.context?.isRefresh ||
          request.context?.isRefreshTokenRetry ||
          isRequestAborted(request) ||
          !shouldRefresh(error, options)
        ) {
          return undefined;
        }

        const refreshResult = await getRefreshResult(async () => {
          const refreshRequest = await resolveRefreshRequest(options, { error, request });
          return client.request<TResult, TResult, TBody>({
            ...refreshRequest,
            context: { ...refreshRequest.context, isRefresh: true },
          });
        });
        await options.onRefresh?.(refreshResult);
        if (isRequestAborted(request)) {
          throw createAbortError(request);
        }

        const retryRequest = createRefreshRetryRequest(
          request,
          await resolveAccessToken(refreshResult, options),
          options,
        );

        return client.request<unknown, EndpointTransportResponse, unknown>({
          ...retryRequest,
          returnMode: 'response',
        });
      });
    },
  };

  async function getRefreshResult(refresh: () => Promise<TResult>): Promise<TResult> {
    refreshPromise ??= refresh().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }
}
