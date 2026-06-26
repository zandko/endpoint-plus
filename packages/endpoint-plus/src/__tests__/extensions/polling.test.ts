import { describe, expect, it } from 'vitest';
import {
  createInstance,
  type EndpointTransportResponse,
  type InternalEndpointRequestConfig,
} from '../../index';
import { createPollingExtension, type EndpointPollConfig } from '../../extensions/polling';
import { MemoryTransport } from '../test-utils';

describe('polling extension', () => {
  it('polls until a stop condition is satisfied', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance()
      .use(createPollingExtension());

    transport.enqueue(createResponse({ done: false }));
    transport.enqueue(createResponse({ done: true }));
    endpoint.setTransport(transport);

    const pollConfig: EndpointPollConfig<{ done: boolean }> = {
      interval: 1,
      maxAttempts: 2,
      stopCondition: (response) => response.done,
    };

    await expect(endpoint.poll<{ done: boolean }>('/jobs/1', pollConfig)).resolves.toEqual({
      done: true,
    });
    expect(transport.requests).toHaveLength(2);
  });

  it('throws when maxAttempts is reached before stop condition passes', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance().use(createPollingExtension());

    transport.enqueue(createResponse({ done: false }));
    transport.enqueue(createResponse({ done: false }));
    endpoint.setTransport(transport);

    await expect(
      endpoint.poll<{ done: boolean }>('/jobs/1', {
        interval: 1,
        maxAttempts: 2,
        stopCondition: (response) => response.done,
      }),
    ).rejects.toThrow('Polling reached maxAttempts without satisfying stopCondition.');
    expect(transport.requests).toHaveLength(2);
  });

  it('passes request config into polling requests', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance({ baseURL: 'https://api.example.com' }).use(
      createPollingExtension(),
    );

    endpoint.setTransport(transport);

    await expect(
      endpoint.poll('/jobs/1', {
        request: {
          headers: { 'X-Trace': '1' },
          params: { verbose: true },
        },
      }),
    ).resolves.toEqual({ code: 20000, data: { ok: true }, message: 'ok' });
    expect(transport.requests[0]).toMatchObject({
      baseURL: 'https://api.example.com',
      headers: { 'X-Trace': '1' },
      params: { verbose: true },
      url: '/jobs/1',
    });
  });

  it('runs long polling until stop condition passes', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance().use(createPollingExtension());
    const messages: Array<{ done: boolean; id: number }> = [];

    transport.enqueue(createResponse({ done: false, id: 1 }));
    transport.enqueue(createResponse({ done: true, id: 2 }));
    endpoint.setTransport(transport);

    await endpoint.longPoll<{ done: boolean; id: number }>(
      '/notifications',
      (message) => {
        messages.push(message);
      },
      {
        interval: 1,
        stopCondition: (message) => message.done,
      },
    );

    expect(messages).toEqual([
      { done: false, id: 1 },
      { done: true, id: 2 },
    ]);
  });

  it('delegates long polling errors to onError', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance().use(createPollingExtension());
    const errors: unknown[] = [];
    const controller = new AbortController();

    transport.enqueue(new Error('temporary failure'));
    endpoint.setTransport(transport);

    await endpoint.longPoll('/notifications', () => undefined, {
      interval: 1,
      onError: (error) => {
        errors.push(error);
        controller.abort();
      },
      signal: controller.signal,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ message: 'temporary failure' });
  });
});

function createResponse(data: unknown): EndpointTransportResponse {
  return {
    config: {} as InternalEndpointRequestConfig,
    data,
    status: 200,
  };
}
