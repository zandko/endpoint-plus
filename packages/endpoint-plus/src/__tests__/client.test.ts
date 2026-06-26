import { describe, expect, it } from 'vitest';
import {
  createInstance,
  type EndpointTransportResponse,
  type InternalEndpointRequestConfig,
} from '../index';
import { MemoryTransport } from './test-utils';

describe('client operations', () => {
  it('supports request and response interceptors', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance();

    endpoint.setTransport(transport);
    endpoint.registerRequestInterceptor((config) => ({
      ...config,
      headers: { ...config.headers, 'X-Trace': '1' },
    }));
    endpoint.registerResponseInterceptor((response) => ({
      ...response,
      data: { changed: true },
    }));

    await expect(endpoint.get('/trace')).resolves.toEqual({ changed: true });
    expect(transport.requests[0]?.headers['X-Trace']).toBe('1');
  });

  it('wraps transport response errors', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance();
    const error = new Error('failed') as Error & {
      response: EndpointTransportResponse;
    };

    endpoint.setTransport(transport);
    error.response = {
      data: { code: 40001, message: 'unauthorized', data: null },
      headers: { 'x-trace': '1' },
      statusText: 'Unauthorized',
      status: 401,
      config: {} as InternalEndpointRequestConfig,
    } as EndpointTransportResponse;
    transport.enqueue(error);

    await expect(endpoint.get('/secure')).rejects.toMatchObject({
      cause: error,
      headers: { 'x-trace': '1' },
      response: expect.objectContaining({ status: 401 }),
      status: 401,
      statusText: 'Unauthorized',
    });
  });
});
