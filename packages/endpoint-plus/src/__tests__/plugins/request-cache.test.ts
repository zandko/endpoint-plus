import { describe, expect, it } from 'vitest';
import { createInstance } from '../../index';
import { createRequestCachePlugin } from '../../plugins/request-cache';
import type {
  EndpointTransport,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
} from '../../types';

class DeferredTransport implements EndpointTransport {
  public requests: InternalEndpointRequestConfig[] = [];
  private response?: EndpointTransportResponse;
  private resolve?: (response: EndpointTransportResponse) => void;

  complete(response: EndpointTransportResponse): void {
    this.response = response;
    this.resolve?.(response);
  }

  request(config: InternalEndpointRequestConfig): Promise<EndpointTransportResponse> {
    this.requests.push(config);

    if (this.response) {
      return Promise.resolve({ ...this.response, config });
    }

    return new Promise((resolve) => {
      this.resolve = (response) => resolve({ ...response, config });
    });
  }
}

describe('request-cache-plugin', () => {
  it('dedupes concurrent GET requests with the same cache key', async () => {
    const transport = new DeferredTransport();
    const endpoint = createInstance().use(createRequestCachePlugin());

    endpoint.setTransport(transport);

    const first = endpoint.get('/profile', { params: { id: 1 } });
    const second = endpoint.get('/profile', { params: { id: 1 } });

    transport.complete({
      config: {} as InternalEndpointRequestConfig,
      data: { ok: true },
      status: 200,
    });

    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(transport.requests).toHaveLength(1);
  });

  it('serves cached GET responses within ttl', async () => {
    const transport = new DeferredTransport();
    const endpoint = createInstance().use(createRequestCachePlugin({ ttl: 60_000 }));

    endpoint.setTransport(transport);
    transport.complete({
      config: {} as InternalEndpointRequestConfig,
      data: { ok: true },
      status: 200,
    });

    await expect(endpoint.get('/profile')).resolves.toEqual({ ok: true });
    await expect(endpoint.get('/profile')).resolves.toEqual({ ok: true });
    expect(transport.requests).toHaveLength(1);
  });

  it('can be disabled per request through extensions', async () => {
    const transport = new DeferredTransport();
    const endpoint = createInstance().use(createRequestCachePlugin({ ttl: 60_000 }));

    endpoint.setTransport(transport);
    transport.complete({
      config: {} as InternalEndpointRequestConfig,
      data: { ok: true },
      status: 200,
    });

    await expect(
      endpoint.get('/profile', {
        extensions: {
          requestCache: false,
        },
      }),
    ).resolves.toEqual({ ok: true });
    await expect(
      endpoint.get('/profile', {
        extensions: {
          requestCache: false,
        },
      }),
    ).resolves.toEqual({ ok: true });
    expect(transport.requests).toHaveLength(2);
  });
});
