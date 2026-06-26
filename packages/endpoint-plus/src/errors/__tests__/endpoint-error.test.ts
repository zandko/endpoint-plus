import { describe, expect, it } from 'vitest';
import { EndpointError } from '../endpoint-error';
import type { InternalEndpointRequestConfig } from '../../types';

describe('EndpointError', () => {
  it('should initialize properties from options', () => {
    const config = { url: '/test' } as InternalEndpointRequestConfig;
    const response = { status: 400, headers: { 'x-test': '1' } } as any;

    const error = new EndpointError('test error', {
      cause: 'cause',
      code: 'ERR_NETWORK',
      config,
      data: { foo: 'bar' },
      response,
    });

    expect(error.message).toBe('test error');
    expect(error.name).toBe('EndpointError');
    expect(error.cause).toBe('cause');
    expect(error.code).toBe('ERR_NETWORK');
    expect(error.config).toBe(config);
    expect(error.data).toEqual({ foo: 'bar' });
    expect(error.response).toBe(response);
    expect(error.status).toBe(400);
    expect(error.headers).toEqual({ 'x-test': '1' });
  });

  it('should correctly evaluate getter properties for standard error codes', () => {
    const networkError = new EndpointError('network', { code: 'ERR_NETWORK' });
    expect(networkError.isNetworkError).toBe(true);
    expect(networkError.isTimeout).toBe(false);
    expect(networkError.isCancel).toBe(false);

    const timeoutError = new EndpointError('timeout', { code: 'ERR_TIMEOUT' });
    expect(timeoutError.isNetworkError).toBe(false);
    expect(timeoutError.isTimeout).toBe(true);
    expect(timeoutError.isCancel).toBe(false);

    const cancelError = new EndpointError('cancel', { code: 'ERR_ABORTED' });
    expect(cancelError.isNetworkError).toBe(false);
    expect(cancelError.isTimeout).toBe(false);
    expect(cancelError.isCancel).toBe(true);

    const otherError = new EndpointError('other', { code: 'ERR_BAD_RESPONSE' });
    expect(otherError.isNetworkError).toBe(false);
    expect(otherError.isTimeout).toBe(false);
    expect(otherError.isCancel).toBe(false);
  });
});
