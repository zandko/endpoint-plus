import { describe, expect, it } from 'vitest';
import {
  createInstance,
  type EndpointTransport,
  type EndpointTransportResponse,
  type InternalEndpointRequestConfig,
} from '../../index';
import { createAuthTokenPlugin } from '../../plugins/auth-token';
import { RETRY_PLUGIN, createRetryPlugin } from '../../plugins/retry';
import { MemoryTransport } from '../test-utils';

describe('retry-plugin', () => {
  it('exposes a stable symbol plugin id', () => {
    expect(createRetryPlugin().id).toBe(RETRY_PLUGIN);
  });

  it('retries idempotent requests for retryable status codes', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance().use(createRetryPlugin({ delay: 0, retries: 2 }));
    const error = new Error('server error') as Error & { response: EndpointTransportResponse };

    error.response = {
      config: {
        headers: {},
        method: 'GET',
        url: '/unstable',
      } as InternalEndpointRequestConfig,
      data: { message: 'server error' },
      status: 503,
    };
    transport.enqueue(error);
    transport.enqueue({
      config: {} as InternalEndpointRequestConfig,
      data: { ok: true },
      status: 200,
    });
    endpoint.setTransport(transport);

    await expect(endpoint.get('/unstable')).resolves.toEqual({ ok: true });
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests[1]?.context?.retryAttempt).toBe(1);
  });

  it('does not retry post requests or unauthorized responses by default', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance().use(createRetryPlugin({ delay: 0, retries: 2 }));
    const postError = new Error('bad gateway') as Error & {
      response: EndpointTransportResponse;
    };
    const unauthorizedError = new Error('unauthorized') as Error & {
      response: EndpointTransportResponse;
    };

    postError.response = {
      config: {
        headers: {},
        method: 'POST',
        url: '/submit',
      } as InternalEndpointRequestConfig,
      data: null,
      status: 502,
    };
    unauthorizedError.response = {
      config: {
        headers: {},
        method: 'GET',
        url: '/secure',
      } as InternalEndpointRequestConfig,
      data: null,
      status: 401,
    };

    transport.enqueue(postError);
    endpoint.setTransport(transport);

    await expect(endpoint.post('/submit')).rejects.toMatchObject({ status: 502 });

    transport.enqueue(unauthorizedError);
    await expect(endpoint.get('/secure')).rejects.toMatchObject({ status: 401 });
    expect(transport.requests).toHaveLength(2);
  });

  it('does not retry aborted requests', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance().use(createRetryPlugin({ delay: 0, retries: 2 }));
    const controller = new AbortController();
    const error = new Error('aborted') as Error & {
      config: InternalEndpointRequestConfig;
    };

    error.name = 'AbortError';
    error.config = {
      headers: {},
      method: 'GET',
      signal: controller.signal,
      url: '/aborted',
    } as InternalEndpointRequestConfig;
    transport.enqueue(error);
    endpoint.setTransport(transport);

    await expect(endpoint.get('/aborted', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(transport.requests).toHaveLength(1);
  });

  it('stops retrying when the request is aborted during retry delay', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance().use(createRetryPlugin({ delay: 1000, retries: 2 }));
    const controller = new AbortController();
    const error = new Error('server error') as Error & { response: EndpointTransportResponse };

    error.response = {
      config: {
        headers: {},
        method: 'GET',
        signal: controller.signal,
        url: '/slow-retry',
      } as InternalEndpointRequestConfig,
      data: null,
      status: 503,
    };
    transport.enqueue(error);
    endpoint.setTransport(transport);

    const request = endpoint.get('/slow-retry', { signal: controller.signal });
    setTimeout(() => controller.abort('user-cancelled'), 0);

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(transport.requests).toHaveLength(1);
  });

  it('retries idempotent timeout-like transport errors', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance().use(createRetryPlugin({ delay: 0, retries: 1 }));
    const error = new Error('request timeout') as Error & {
      code: string;
      config: InternalEndpointRequestConfig;
    };

    error.code = 'ERR_TIMEOUT';
    error.config = {
      headers: {},
      method: 'GET',
      timeout: 100,
      url: '/timeout',
    } as InternalEndpointRequestConfig;
    transport.enqueue(error);
    transport.enqueue({
      config: {} as InternalEndpointRequestConfig,
      data: { ok: true },
      status: 200,
    });
    endpoint.setTransport(transport);

    await expect(endpoint.get('/timeout', { timeout: 100 })).resolves.toEqual({ ok: true });
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests[1]?.context?.retryAttempt).toBe(1);
  });

  it('keeps auth headers on retried requests', async () => {
    const transport = new RetryHeaderTransport();
    const endpoint = createInstance()
      .use(createAuthTokenPlugin({ getToken: () => 'access-token' }))
      .use(createRetryPlugin({ delay: 0, retries: 1 }));

    endpoint.setTransport(transport);

    await expect(endpoint.get('/with-auth')).resolves.toEqual({ ok: true });
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests[0]?.headers.Authorization).toBe('Bearer access-token');
    expect(transport.requests[1]?.headers.Authorization).toBe('Bearer access-token');
  });
});

class RetryHeaderTransport implements EndpointTransport {
  public requests: InternalEndpointRequestConfig[] = [];

  async request(config: InternalEndpointRequestConfig): Promise<EndpointTransportResponse> {
    this.requests.push(config);

    if (this.requests.length === 1) {
      const error = new Error('server error') as Error & {
        response: EndpointTransportResponse;
      };

      error.response = {
        config,
        data: null,
        status: 503,
      };

      throw error;
    }

    return {
      config,
      data: { ok: true },
      status: 200,
    };
  }
}
