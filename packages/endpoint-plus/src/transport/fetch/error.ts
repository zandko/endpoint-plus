import { isError, isPlainObject } from 'es-toolkit';
import type { FetchResponse } from 'ofetch';
import type { InternalEndpointRequestConfig } from '../../types';
import { createTransportError, type EndpointTransportError } from '../shared/error';
import { toFetchTransportResponse } from './response';
import type { EndpointErrorCode } from '../../errors/error-codes';

export function normalizeFetchError(
  error: unknown,
  config: InternalEndpointRequestConfig,
): EndpointTransportError {
  const response = getFetchErrorResponse(error);

  let code: EndpointErrorCode | undefined;
  if (isError(error)) {
    if (error.name === 'AbortError') {
      code = 'ERR_ABORTED';
    } else if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      code = 'ERR_TIMEOUT';
    } else if (
      error.name === 'TypeError' &&
      (error.message === 'Failed to fetch' || error.message === 'Network request failed')
    ) {
      code = 'ERR_NETWORK';
    }
  }

  if (!code && response && response.status >= 400) {
    code = 'ERR_BAD_RESPONSE';
  }

  return createTransportError(
    error,
    config,
    response ? toFetchTransportResponse(response, config) : undefined,
    code,
  );
}

function getFetchErrorResponse(error: unknown): FetchResponse<unknown> | undefined {
  if (isRecordLike(error) && 'response' in error) {
    return error.response as FetchResponse<unknown>;
  }

  return undefined;
}

function isRecordLike(value: unknown): value is Record<PropertyKey, unknown> {
  return isPlainObject(value) || isError(value);
}
