import { describe, expect, it } from 'vitest';
import { normalizeFetchError } from '../error';
import type { InternalEndpointRequestConfig } from '../../../types';

describe('normalizeFetchError', () => {
  const config = { url: '/test' } as InternalEndpointRequestConfig;

  it('should extract ERR_ABORTED from AbortError', () => {
    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    const normalized = normalizeFetchError(error, config);
    expect(normalized.code).toBe('ERR_ABORTED');
  });

  it('should extract ERR_TIMEOUT from TimeoutError', () => {
    const error = new Error('The operation timed out.');
    error.name = 'TimeoutError';
    const normalized = normalizeFetchError(error, config);
    expect(normalized.code).toBe('ERR_TIMEOUT');
  });

  it('should extract ERR_TIMEOUT from message containing timeout', () => {
    const error = new Error('timeout');
    const normalized = normalizeFetchError(error, config);
    expect(normalized.code).toBe('ERR_TIMEOUT');
  });

  it('should extract ERR_NETWORK from fetch TypeError', () => {
    const error = new TypeError('Failed to fetch');
    const normalized = normalizeFetchError(error, config);
    expect(normalized.code).toBe('ERR_NETWORK');

    const error2 = new TypeError('Network request failed');
    const normalized2 = normalizeFetchError(error2, config);
    expect(normalized2.code).toBe('ERR_NETWORK');
  });

  it('should extract ERR_BAD_RESPONSE from error with response status >= 400', () => {
    const error: any = new Error('Bad Request');
    error.response = { status: 400, statusText: 'Bad Request', headers: new Headers() };
    const normalized = normalizeFetchError(error, config);
    expect(normalized.code).toBe('ERR_BAD_RESPONSE');
  });
});
