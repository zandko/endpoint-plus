import type { Awaitable } from '../types';
import { describe, expectTypeOf, it } from 'vitest';
import {
  EndpointError,
  createInstance,
  type EndpointPlugin,
  type EndpointRequestConfig,
  type EndpointTransport,
  type InternalEndpointRequestConfig,
} from '../index';
import { createPollingExtension } from '../extensions/polling';
import {
  createSseExtension,
  type EndpointSseConfig,
  type EndpointSseEvent,
} from '../extensions/sse';
import { createWorkflowExtension } from '../extensions/workflow';
import {
  downloadFile as downloadNodeFile,
  type NodeDownloadFileResult,
  uploadFile as uploadNodeFile,
} from '../node';
import {
  downloadFile as downloadMiniappFile,
  type MiniappDownloadFileResponse,
  type MiniappUploadFileResponse,
  uploadFile as uploadMiniappFile,
} from '../miniapp';
import { createAxiosTransport } from '../transport/axios';
import { createFetchTransport } from '../transport/fetch';
import { createMiniappTransport } from '../transport/miniapp';
import { createAuthTokenPlugin } from '../plugins/auth-token';

import {
  createObservabilityPlugin,
  type ObservabilityPluginOptions,
  type ObservabilityResponseEvent,
} from '../plugins/observability';
import { createRefreshTokenPlugin } from '../plugins/refresh-token';
import {
  createRequestCachePlugin,
  type RequestCacheRequestOptions,
} from '../plugins/request-cache';
import { createRequestGatePlugin, type RequestGateRequestOptions } from '../plugins/request-gate';
import { createRetryPlugin, type RetryPluginOptions } from '../plugins/retry';
import { createTypegenPlugin, type TypegenRequestOptions } from '../plugins/typegen';
import { MemoryTransport } from './test-utils';

declare global {
  namespace YwEndpoint {
    interface RequestExtensions {
      tenant?:
        | false
        | {
            id: string;
          };
    }
  }
}

declare module '../index' {
  namespace YwEndpoint {
    interface Routes {
      'GET /typed-users': { response: { id: number; name: string } };
      'GET /typed-users/:id': { response: { id: number; detail: true } };
      'GET /typed-users/:userId/orders': { response: { orders: Array<{ id: number }> } };
      'GET /typed-users/:userId/orders/:orderId': { response: { orderId: number } };
      'POST /typed-users': { response: { id: number; created: true } };
      'PUT /typed-users/:id': { response: { updated: true } };
    }
  }
}

describe('public api types', () => {
  it('keeps root factory and plugins type-safe', () => {
    expectTypeOf(createInstance).returns.toHaveProperty('request');
    expectTypeOf(
      createAuthTokenPlugin({ getToken: async () => 'token' }),
    ).toMatchTypeOf<EndpointPlugin>();
    expectTypeOf(
      createRefreshTokenPlugin<{ accessToken: string }>({
        refreshRequest: async () => ({ method: 'POST', url: '/refresh' }),
        resolveAccessToken: (session) => session.accessToken,
      }),
    ).toMatchTypeOf<EndpointPlugin>();
    expectTypeOf(
      createRetryPlugin({ shouldRetry: async () => true }),
    ).toMatchTypeOf<EndpointPlugin>();
    expectTypeOf(
      createRetryPlugin({} satisfies RetryPluginOptions),
    ).toMatchTypeOf<EndpointPlugin>();
    expectTypeOf(createRequestCachePlugin()).toMatchTypeOf<EndpointPlugin>();
    expectTypeOf(createRequestGatePlugin()).toMatchTypeOf<EndpointPlugin>();
    expectTypeOf(createObservabilityPlugin()).toMatchTypeOf<EndpointPlugin>();
    expectTypeOf(createTypegenPlugin()).toMatchTypeOf<EndpointPlugin>();
    expectTypeOf<EndpointRequestConfig['extensions']>().toMatchTypeOf<
      | {
          requestCache?: false | RequestCacheRequestOptions;
          requestGate?: false | RequestGateRequestOptions;
          tenant?: false | { id: string };
          typegen?: boolean | TypegenRequestOptions;
        }
      | undefined
    >();
  });

  it('keeps runtime transport entries separated', () => {
    expectTypeOf(createFetchTransport()).toMatchTypeOf<EndpointTransport>();
    expectTypeOf(createAxiosTransport()).toMatchTypeOf<EndpointTransport>();
    expectTypeOf(
      createMiniappTransport({
        runtime: {
          request: () => undefined,
        },
      }),
    ).toMatchTypeOf<EndpointTransport>();

    expectTypeOf(downloadNodeFile).parameters.toMatchTypeOf<
      [
        endpoint: Parameters<typeof downloadNodeFile>[0],
        url: string,
        path: string,
        config?: EndpointRequestConfig,
      ]
    >();
    expectTypeOf<
      Awaited<ReturnType<typeof downloadNodeFile>>
    >().toEqualTypeOf<NodeDownloadFileResult>();
    expectTypeOf<Awaited<ReturnType<typeof uploadNodeFile>>>().toBeUnknown();
    expectTypeOf<
      Awaited<ReturnType<typeof uploadMiniappFile>>
    >().toMatchTypeOf<MiniappUploadFileResponse>();
    expectTypeOf<
      Awaited<ReturnType<typeof downloadMiniappFile>>
    >().toMatchTypeOf<MiniappDownloadFileResponse>();
  });

  it('keeps feature extensions opt-in and type-safe', () => {
    const endpoint = createInstance()
      .use(createPollingExtension())
      .use(createSseExtension())
      .use(createWorkflowExtension());

    expectTypeOf(endpoint.poll).toBeFunction();
    expectTypeOf(endpoint.longPoll).toBeFunction();
    expectTypeOf(endpoint.sse).toBeFunction();
    expectTypeOf(endpoint.all).toBeFunction();
    expectTypeOf(endpoint.sequence).toBeFunction();
    expectTypeOf(endpoint.pipeline).toBeFunction();
  });

  it('keeps async extension callbacks awaitable', () => {
    expectTypeOf<EndpointRequestConfig['setAuthorizationHeader']>().toMatchTypeOf<
      string | ((config: InternalEndpointRequestConfig) => Awaitable<string | null>) | undefined
    >();
    expectTypeOf<EndpointSseConfig<string>['onBatch']>().toEqualTypeOf<
      ((events: Array<EndpointSseEvent<string>>) => Awaitable<void>) | undefined
    >();
    expectTypeOf<
      Parameters<NonNullable<ObservabilityPluginOptions['onResponse']>>[0]
    >().toEqualTypeOf<ObservabilityResponseEvent>();
    expectTypeOf(new EndpointError('failed')).toMatchTypeOf<Error>();
  });

  it('infers response types from generated endpoint routes while allowing manual overrides', () => {
    const endpoint = createInstance();
    endpoint.setTransport(new MemoryTransport());

    expectTypeOf(endpoint.get('/typed-users')).resolves.toEqualTypeOf<{
      id: number;
      name: string;
    }>();
    expectTypeOf(endpoint.get('/typed-users/1')).resolves.toEqualTypeOf<{
      id: number;
      detail: true;
    }>();
    expectTypeOf(endpoint.get('/typed-users/1/orders')).resolves.toEqualTypeOf<{
      orders: Array<{ id: number }>;
    }>();
    expectTypeOf(endpoint.get('/typed-users/1/orders/2')).resolves.toEqualTypeOf<{
      orderId: number;
    }>();
    expectTypeOf(endpoint.get('/typed-users/1/orders/2?include=items')).resolves.toEqualTypeOf<{
      orderId: number;
    }>();
    expectTypeOf(endpoint.get('/typed-users/1/orders/2/lines')).resolves.toBeUnknown();
    expectTypeOf(endpoint.get('/typed-users/1/orders/')).resolves.toEqualTypeOf<{
      orders: Array<{ id: number }>;
    }>();
    expectTypeOf(endpoint.post('/typed-users', { name: 'Ada' })).resolves.toEqualTypeOf<{
      id: number;
      created: true;
    }>();
    expectTypeOf(endpoint.put('/typed-users/1', { name: 'Ada' })).resolves.toEqualTypeOf<{
      updated: true;
    }>();
    expectTypeOf(endpoint.request({ method: 'GET', url: '/typed-users' })).resolves.toEqualTypeOf<{
      id: number;
      name: string;
    }>();
    expectTypeOf(endpoint.get<{ manual: true }>('/typed-users')).resolves.toEqualTypeOf<{
      manual: true;
    }>();
  });
});
