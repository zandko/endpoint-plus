import type { InternalEndpointRequestConfig } from '../types';
import { EndpointError } from './endpoint-error';

/**
 * Create an AbortError with the given request config.
 */
export function createAbortError(config: InternalEndpointRequestConfig): Error {
  const error = new EndpointError('Request was aborted.', {
    cause: config.signal?.reason,
    code: 'ERR_ABORTED',
    config,
  });
  error.name = 'AbortError';

  return error;
}
