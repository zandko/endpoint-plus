import { isError, isPlainObject } from 'es-toolkit';
import type { InternalEndpointRequestConfig } from '../../types';
import { createTransportError, type EndpointTransportError } from '../shared/error';
import { toMiniappTransportResponse } from './response';
import type { MiniappResponse } from './types';
import type { EndpointErrorCode } from '../../errors/error-codes';

export function normalizeMiniappError(
  error: unknown,
  config: InternalEndpointRequestConfig,
  response?: MiniappResponse,
): EndpointTransportError {
  let code: EndpointErrorCode | undefined;

  const errMsg = isError(error)
    ? error.message
    : isPlainObject(error)
      ? String((error as Record<string, unknown>).errMsg || '')
      : String(error);

  if (errMsg.includes('timeout')) {
    code = 'ERR_TIMEOUT';
  } else if (errMsg.includes('abort') || errMsg.includes('cancel')) {
    code = 'ERR_ABORTED';
  } else if (errMsg.includes('fail')) {
    code = 'ERR_NETWORK';
  }

  if (!code && response && (response.statusCode ?? response.status ?? 0) >= 400) {
    code = 'ERR_BAD_RESPONSE';
  }

  return createTransportError(
    error,
    config,
    response ? toMiniappTransportResponse(response, config) : undefined,
    code,
  );
}
