import { describe, expect, it, vi } from 'vitest';
import {
  createInstance,
  type EndpointTransport,
  type EndpointTransportResponse,
  type InternalEndpointRequestConfig,
} from '../../index';
import { createRequestGatePlugin } from '../../plugins/request-gate';

class BlockingTransport implements EndpointTransport {
  public requests: InternalEndpointRequestConfig[] = [];

  request(config: InternalEndpointRequestConfig): Promise<EndpointTransportResponse> {
    this.requests.push(config);

    return new Promise((resolve, reject) => {
      if (config.signal?.aborted) {
        reject(createAbortError());
        return;
      }

      config.signal?.addEventListener('abort', () => reject(createAbortError()), { once: true });

      setTimeout(() => {
        resolve({
          config,
          data: { ok: true, url: config.url },
          status: 200,
        });
      }, 10);
    });
  }
}

function createAbortError(): Error {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}

describe('request-gate-plugin', () => {
  it('rejects duplicate requests when dedupe behavior is reject', async () => {
    const endpoint = createInstance().use(createRequestGatePlugin());
    const transport = new BlockingTransport();
    endpoint.setTransport(transport);

    const first = endpoint.post(
      '/submit',
      { name: 'yw' },
      {
        extensions: {
          requestGate: {
            behavior: 'reject',
            key: 'submit-form',
            mode: 'dedupe',
          },
        },
      },
    );
    const second = endpoint.post(
      '/submit',
      { name: 'yw' },
      {
        extensions: {
          requestGate: {
            behavior: 'reject',
            key: 'submit-form',
            mode: 'dedupe',
          },
        },
      },
    );

    await expect(second).rejects.toMatchObject({
      message: 'Duplicate request was blocked.',
    });
    await expect(first).resolves.toEqual({ ok: true, url: '/submit' });
    expect(transport.requests).toHaveLength(1);
  });

  it('debounces requests and only sends the latest request', async () => {
    vi.useFakeTimers();
    const endpoint = createInstance().use(createRequestGatePlugin());
    const transport = new BlockingTransport();
    endpoint.setTransport(transport);

    const first = endpoint.get('/search', {
      extensions: {
        requestGate: {
          key: 'search',
          mode: 'debounce',
          wait: 20,
        },
      },
    });
    const second = endpoint.get('/search', {
      extensions: {
        requestGate: {
          key: 'search',
          mode: 'debounce',
          wait: 20,
        },
      },
    });

    await expect(first).rejects.toMatchObject({
      message: 'Debounced request was replaced.',
    });
    await vi.advanceTimersByTimeAsync(30);
    await expect(second).resolves.toEqual({ ok: true, url: '/search' });
    expect(transport.requests).toHaveLength(1);
    vi.useRealTimers();
  });

  it('rejects throttled requests inside the wait window', async () => {
    const endpoint = createInstance().use(createRequestGatePlugin());
    const transport = new BlockingTransport();
    endpoint.setTransport(transport);

    const first = endpoint.get('/users', {
      extensions: {
        requestGate: {
          key: 'users-refresh',
          mode: 'throttle',
          wait: 100,
        },
      },
    });
    const second = endpoint.get('/users', {
      extensions: {
        requestGate: {
          key: 'users-refresh',
          mode: 'throttle',
          wait: 100,
        },
      },
    });

    await expect(second).rejects.toMatchObject({
      message: 'Throttled request was blocked.',
    });
    await expect(first).resolves.toEqual({ ok: true, url: '/users' });
    expect(transport.requests).toHaveLength(1);
  });
});
