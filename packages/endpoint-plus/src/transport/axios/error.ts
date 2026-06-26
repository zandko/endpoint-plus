import axios from 'axios';
import type { InternalEndpointRequestConfig } from '../../types';
import { createTransportError, type EndpointTransportError } from '../shared/error';
import { toAxiosTransportResponse } from './response';
import type { EndpointErrorCode } from '../../errors/error-codes';

export function normalizeAxiosError(
  error: unknown,
  config: InternalEndpointRequestConfig,
): EndpointTransportError {
  const response =
    axios.isAxiosError(error) && error.response
      ? toAxiosTransportResponse(error.response, config)
      : undefined;

  let code: EndpointErrorCode | undefined;

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      code = 'ERR_TIMEOUT';
    } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      code = 'ERR_NETWORK';
    } else if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      code = 'ERR_ABORTED';
    }
  }

  if (!code && response && response.status >= 400) {
    code = 'ERR_BAD_RESPONSE';
  }

  return createTransportError(error, config, response, code);
}
