import { describe, expect, it } from 'vitest';
import {
  createInstance,
  type EndpointTransportResponse,
  type InternalEndpointRequestConfig,
} from '../../index';
import { OBSERVABILITY_PLUGIN, createObservabilityPlugin } from '../../plugins/observability';
import { MemoryTransport } from '../test-utils';

describe('observability-plugin', () => {
  it('exposes a stable symbol plugin id', () => {
    expect(createObservabilityPlugin().id).toBe(OBSERVABILITY_PLUGIN);
  });

  it('reports request and response lifecycle events', async () => {
    const transport = new MemoryTransport();
    const events: string[] = [];
    const endpoint = createInstance().use(
      createObservabilityPlugin({
        now: createClock([10, 25]),
        onRequest: ({ request, startedAt }) => {
          events.push(`request:${request.url}:${startedAt}`);
        },
        onResponse: ({ duration, response }) => {
          events.push(`response:${response.status}:${duration}`);
        },
      }),
    );

    transport.enqueue({
      config: {} as InternalEndpointRequestConfig,
      data: { ok: true },
      status: 204,
    });
    endpoint.setTransport(transport);

    await expect(endpoint.get('/health')).resolves.toEqual({ ok: true });
    expect(events).toEqual(['request:/health:10', 'response:204:15']);
  });

  it('reports transport errors without swallowing them', async () => {
    const transport = new MemoryTransport();
    const errors: Array<{ duration: number; message: string }> = [];
    const endpoint = createInstance().use(
      createObservabilityPlugin({
        now: createClock([100, 130]),
        onError: ({ duration, error }) => {
          errors.push({
            duration,
            message: error instanceof Error ? error.message : String(error),
          });
        },
      }),
    );
    const error = new Error('offline') as Error & { response: EndpointTransportResponse };

    error.response = {
      config: {
        headers: {},
        method: 'GET',
        url: '/offline',
      } as InternalEndpointRequestConfig,
      data: null,
      status: 503,
    };
    transport.enqueue(error);
    endpoint.setTransport(transport);

    await expect(endpoint.get('/offline')).rejects.toMatchObject({ status: 503 });
    expect(errors).toEqual([{ duration: 30, message: 'offline' }]);
  });
});

function createClock(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}
