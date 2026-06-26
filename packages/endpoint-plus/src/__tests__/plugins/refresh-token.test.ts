import { describe, expect, it } from 'vitest';
import {
  EndpointError,
  createInstance,
  type EndpointTransportResponse,
  type InternalEndpointRequestConfig,
} from '../../index';
import { createAuthTokenPlugin } from '../../plugins/auth-token';
import { REFRESH_TOKEN_PLUGIN, createRefreshTokenPlugin } from '../../plugins/refresh-token';
import { createRetryPlugin } from '../../plugins/retry';
import { MemoryTransport } from '../test-utils';

function createUnauthorizedError(
  signal?: AbortSignal,
): Error & { response: EndpointTransportResponse } {
  const error = new Error('unauthorized') as Error & {
    response: EndpointTransportResponse;
  };

  error.response = {
    config: {
      headers: { Authorization: 'Bearer old-token' },
      method: 'GET',
      signal,
      url: '/secure',
    } as InternalEndpointRequestConfig,
    data: { code: 40001, data: null, message: 'unauthorized' },
    status: 401,
  };

  return error;
}

describe('refresh-token-plugin', () => {
  it('exposes stable symbol plugin ids', () => {
    expect(createRefreshTokenPlugin({ refreshRequest: {} }).id).toBe(REFRESH_TOKEN_PLUGIN);
  });

  it('runs the token refresh flow on default unauthorized responses', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance()
      .use(createAuthTokenPlugin({ getToken: () => 'old-token' }))
      .use(
        createRefreshTokenPlugin<{ code: number; data: { accessToken: string } }>({
          refreshRequest: {
            method: 'POST',
            url: '/session/refresh',
          },
          resolveAccessToken: (result) => result.data.accessToken,
        }),
      );
    const error = new Error('unauthorized') as Error & {
      response: EndpointTransportResponse;
    };

    error.response = {
      config: {
        headers: { Authorization: 'Bearer old-token' },
        method: 'GET',
        url: '/secure',
      } as InternalEndpointRequestConfig,
      data: { code: 40001, data: null, message: 'unauthorized' },
      status: 401,
    } as EndpointTransportResponse;
    transport.enqueue(error);
    transport.enqueue({
      config: {} as InternalEndpointRequestConfig,
      data: { code: 20000, data: { accessToken: 'new-token' } },
      status: 200,
    } as EndpointTransportResponse);
    transport.enqueue({
      config: {} as InternalEndpointRequestConfig,
      data: { code: 20000, data: { ok: true } },
      status: 200,
    } as EndpointTransportResponse);

    endpoint.setTransport(transport);

    await expect(endpoint.get('/secure')).resolves.toEqual({
      code: 20000,
      data: { ok: true },
    });
    expect(transport.requests).toHaveLength(3);
    expect(transport.requests[1]).toMatchObject({
      context: { isRefresh: true },
      method: 'POST',
      url: '/session/refresh',
    });
    expect(transport.requests[1]?.headers.Authorization).toBeUndefined();
    expect(transport.requests[2]?.headers.Authorization).toBe('Bearer new-token');
  });

  it('does not authenticate or refresh requests marked as refresh calls', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance()
      .use(createAuthTokenPlugin({ getToken: () => 'old-token' }))
      .use(
        createRefreshTokenPlugin<{ code: number; data: { accessToken: string } }>({
          refreshRequest: {
            method: 'POST',
            url: '/session/refresh',
          },
          resolveAccessToken: (result) => result.data.accessToken,
        }),
      );
    const error = new Error('refresh failed') as Error & {
      response: EndpointTransportResponse;
    };

    error.response = {
      config: {
        context: { isRefresh: true },
        headers: {},
        method: 'POST',
        url: '/session/refresh',
      } as unknown as InternalEndpointRequestConfig,
      data: { code: 40001, data: null, message: 'unauthorized' },
      status: 401,
    } as EndpointTransportResponse;
    transport.enqueue(error);

    endpoint.setTransport(transport);

    await expect(
      endpoint.post('/session/refresh', undefined, { context: { isRefresh: true } }),
    ).rejects.toBeInstanceOf(EndpointError);
    expect(transport.requests).toHaveLength(1);
    expect(transport.requests[0]?.headers.authorization).toBeUndefined();
  });

  it('lets refresh token handle unauthorized responses when retry is installed', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance()
      .use(createAuthTokenPlugin({ getToken: () => 'old-token' }))
      .use(createRetryPlugin({ delay: 0, retries: 2 }))
      .use(
        createRefreshTokenPlugin<{ code: number; data: { accessToken: string } }>({
          refreshRequest: {
            method: 'POST',
            url: '/session/refresh',
          },
          resolveAccessToken: (result) => result.data.accessToken,
        }),
      );
    const error = new Error('unauthorized') as Error & {
      response: EndpointTransportResponse;
    };

    error.response = {
      config: {
        headers: { Authorization: 'Bearer old-token' },
        method: 'GET',
        url: '/secure',
      } as InternalEndpointRequestConfig,
      data: { code: 40001, data: null, message: 'unauthorized' },
      status: 401,
    };
    transport.enqueue(error);
    transport.enqueue({
      config: {} as InternalEndpointRequestConfig,
      data: { code: 20000, data: { accessToken: 'new-token' } },
      status: 200,
    });
    transport.enqueue({
      config: {} as InternalEndpointRequestConfig,
      data: { code: 20000, data: { ok: true } },
      status: 200,
    });
    endpoint.setTransport(transport);

    await expect(endpoint.get('/secure')).resolves.toEqual({
      code: 20000,
      data: { ok: true },
    });
    expect(transport.requests).toHaveLength(3);
    expect(transport.requests[0]?.context?.retryAttempt).toBeUndefined();
    expect(transport.requests[2]?.headers.Authorization).toBe('Bearer new-token');
  });

  it('shares one refresh request across concurrent unauthorized responses', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance()
      .use(
        createRefreshTokenPlugin<{ code: number; data: { accessToken: string } }>({
          refreshRequest: {
            method: 'POST',
            url: '/session/refresh',
          },
          resolveAccessToken: (result) => result.data.accessToken,
        }),
      );
    transport.enqueue(createUnauthorizedError());
    transport.enqueue(createUnauthorizedError());
    transport.enqueue({
      config: {} as InternalEndpointRequestConfig,
      data: { code: 20000, data: { accessToken: 'new-token' } },
      status: 200,
    });
    transport.enqueue({
      config: {} as InternalEndpointRequestConfig,
      data: { code: 20000, data: { first: true } },
      status: 200,
    });
    transport.enqueue({
      config: {} as InternalEndpointRequestConfig,
      data: { code: 20000, data: { second: true } },
      status: 200,
    });
    endpoint.setTransport(transport);

    await expect(Promise.all([endpoint.get('/secure'), endpoint.get('/secure')])).resolves.toEqual([
      { code: 20000, data: { first: true } },
      { code: 20000, data: { second: true } },
    ]);
    expect(transport.requests.filter((request) => request.context?.isRefresh)).toHaveLength(1);
    expect(transport.requests).toHaveLength(5);
  });

  it('does not replay the failed request when it is aborted during refresh', async () => {
    const controller = new AbortController();
    const transport = new MemoryTransport();
    const endpoint = createInstance()
      .use(
        createRefreshTokenPlugin<{ code: number; data: { accessToken: string } }>({
          refreshRequest: {
            method: 'POST',
            url: '/session/refresh',
          },
          onRefresh: () => {
            controller.abort('route-changed');
          },
          resolveAccessToken: (result) => result.data.accessToken,
        }),
      );

    transport.enqueue(createUnauthorizedError(controller.signal));
    transport.enqueue({
      config: {} as InternalEndpointRequestConfig,
      data: { code: 20000, data: { accessToken: 'new-token' } },
      status: 200,
    });
    endpoint.setTransport(transport);

    await expect(endpoint.get('/secure', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests[1]?.context?.isRefresh).toBe(true);
  });
});
