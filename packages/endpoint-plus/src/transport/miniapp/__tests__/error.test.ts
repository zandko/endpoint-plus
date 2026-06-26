import { describe, expect, it } from 'vitest';
import { normalizeMiniappError } from '../error';
import type { InternalEndpointRequestConfig } from '../../../types';

describe('normalizeMiniappError', () => {
  const config = { url: '/test' } as InternalEndpointRequestConfig;

  it('should extract ERR_TIMEOUT from error message', () => {
    const error = new Error('request:fail timeout');
    const normalized = normalizeMiniappError(error, config);
    expect(normalized.code).toBe('ERR_TIMEOUT');
  });

  it('should extract ERR_TIMEOUT from plain object errMsg', () => {
    const error = { errMsg: 'request:fail timeout' };
    const normalized = normalizeMiniappError(error, config);
    expect(normalized.code).toBe('ERR_TIMEOUT');
  });

  it('should extract ERR_ABORTED from abort error message', () => {
    const error = { errMsg: 'request:fail abort' };
    const normalized = normalizeMiniappError(error, config);
    expect(normalized.code).toBe('ERR_ABORTED');

    const cancelError = { errMsg: 'request:fail canceled' };
    const normalized2 = normalizeMiniappError(cancelError, config);
    expect(normalized2.code).toBe('ERR_ABORTED');
  });

  it('should extract ERR_NETWORK from fail message', () => {
    const error = { errMsg: 'request:fail' };
    const normalized = normalizeMiniappError(error, config);
    expect(normalized.code).toBe('ERR_NETWORK');
  });

  it('should extract ERR_BAD_RESPONSE from error with response status >= 400', () => {
    const error = { errMsg: 'request:ok' };
    const response = { statusCode: 500 };
    const normalized = normalizeMiniappError(error, config, response);
    expect(normalized.code).toBe('ERR_BAD_RESPONSE');
  });

  it('should handle response.status if statusCode is missing', () => {
    const error = { errMsg: 'request:ok' };
    const response = { status: 404 };
    const normalized = normalizeMiniappError(error, config, response);
    expect(normalized.code).toBe('ERR_BAD_RESPONSE');
  });
});
