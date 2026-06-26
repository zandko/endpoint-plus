import { describe, expect, it } from 'vitest';
import axios from 'axios';
import { normalizeAxiosError } from '../error';
import type { InternalEndpointRequestConfig } from '../../../types';

describe('normalizeAxiosError', () => {
  const config = { url: '/test' } as InternalEndpointRequestConfig;

  it('should extract ERR_TIMEOUT from axios ECONNABORTED error', () => {
    const error = new axios.AxiosError('timeout of 1000ms exceeded', 'ECONNABORTED', undefined, {});
    const normalized = normalizeAxiosError(error, config);
    expect(normalized.code).toBe('ERR_TIMEOUT');
  });

  it('should extract ERR_TIMEOUT from axios timeout message', () => {
    const error = new axios.AxiosError('timeout', 'SOMETHING_ELSE', undefined, {});
    const normalized = normalizeAxiosError(error, config);
    expect(normalized.code).toBe('ERR_TIMEOUT');
  });

  it('should extract ERR_NETWORK from axios ERR_NETWORK error', () => {
    const error = new axios.AxiosError('Network Error', 'ERR_NETWORK', undefined, {});
    const normalized = normalizeAxiosError(error, config);
    expect(normalized.code).toBe('ERR_NETWORK');
  });

  it('should extract ERR_ABORTED from axios cancel error', () => {
    const error = new axios.Cancel('canceled');
    const normalized = normalizeAxiosError(error, config);
    expect(normalized.code).toBe('ERR_ABORTED');
  });

  it('should extract ERR_ABORTED from axios ERR_CANCELED error', () => {
    const error = new axios.AxiosError('canceled', 'ERR_CANCELED', undefined, {});
    const normalized = normalizeAxiosError(error, config);
    expect(normalized.code).toBe('ERR_ABORTED');
  });

  it('should set ERR_BAD_RESPONSE if response status is >= 400', () => {
    const error = new axios.AxiosError(
      'Request failed with status code 500',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 500,
        data: {},
        headers: {},
        statusText: 'Internal Server Error',
        config: {} as any,
      },
    );
    const normalized = normalizeAxiosError(error, config);
    expect(normalized.code).toBe('ERR_BAD_RESPONSE');
    expect(normalized.response?.status).toBe(500);
  });

  it('should set ERR_BAD_RESPONSE if response status is 4xx', () => {
    const error = new axios.AxiosError(
      'Request failed with status code 401',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 401,
        data: {},
        headers: {},
        statusText: 'Unauthorized',
        config: {} as any,
      },
    );
    const normalized = normalizeAxiosError(error, config);
    expect(normalized.code).toBe('ERR_BAD_RESPONSE');
    expect(normalized.response?.status).toBe(401);
  });
});
