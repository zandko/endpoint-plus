import type { InternalEndpointRequestConfig } from '../types';

/**
 * Check if the request has been aborted.
 */
export function isRequestAborted(config: InternalEndpointRequestConfig): boolean {
  return Boolean(config.signal?.aborted);
}
