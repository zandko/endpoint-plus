import { describe, expect, it } from 'vitest';
import { EndpointError, createInstance } from '../../index';
import { createSseExtension, type EndpointSseEvent } from '../../extensions/sse';
import { createAuthTokenPlugin } from '../../plugins/auth-token';

const unauthorizedSseFetch: typeof globalThis.fetch = async () => {
  return new Response('unauthorized', {
    status: 401,
    statusText: 'Unauthorized',
  });
};

const batchedSseFetch: typeof globalThis.fetch = async () => {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: one\n\ndata: two\n\ndata: three\n\n'));
        controller.close();
      },
    }),
    { status: 200 },
  );
};

describe('sse feature', () => {
  it('streams parsed server-sent events through fetch with request interceptors', async () => {
    const events: Array<EndpointSseEvent<{ text: string }>> = [];
    const requests: Array<{ init?: RequestInit; url: string }> = [];
    const fetch: typeof globalThis.fetch = async (input, init) => {
      requests.push({ init, url: String(input) });

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('id: 1\nevent: token\ndata: {"text":"hello"}\n\n'),
            );
            controller.close();
          },
        }),
        {
          headers: { 'Content-Type': 'text/event-stream' },
          status: 200,
        },
      );
    };
    const endpoint = createInstance({ baseURL: 'https://api.example.com' })
      .use(createAuthTokenPlugin({ getToken: 'access-token' }))
      .use(createSseExtension());

    await expect(
      endpoint.sse<{ text: string }>('/chat', {
        deserialize: (data) => JSON.parse(data) as { text: string },
        fetch,
        onEvent: (event) => {
          events.push(event);
        },
        params: { room: 'ai' },
      }),
    ).resolves.toMatchObject({
      lastEventId: '1',
    });

    const request = requests[0];

    expect(request).toBeDefined();
    expect(request?.url).toBe('https://api.example.com/chat?room=ai');
    expect(new Headers(request?.init?.headers).get('authorization')).toBe('Bearer access-token');
    expect(events).toEqual([
      {
        data: { text: 'hello' },
        event: 'token',
        id: '1',
        raw: '{"text":"hello"}',
      },
    ]);
  });

  it('serializes non-GET request bodies for native fetch streaming', async () => {
    const requests: RequestInit[] = [];
    const fetch: typeof globalThis.fetch = async (_input, init) => {
      requests.push(init ?? {});

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
        { status: 200 },
      );
    };
    const endpoint = createInstance({ baseURL: 'https://api.example.com' }).use(
      createSseExtension(),
    );

    await endpoint.sse('/chat', {
      data: { prompt: 'hello' },
      fetch,
      method: 'POST',
    });

    expect(requests[0]?.body).toBe(JSON.stringify({ prompt: 'hello' }));
  });

  it('normalizes failed stream responses and calls onClose with the error', async () => {
    const closeResults: unknown[] = [];
    const endpoint = createInstance({ baseURL: 'https://api.example.com' }).use(
      createSseExtension(),
    );

    await expect(
      endpoint.sse('/chat', {
        fetch: unauthorizedSseFetch,
        onClose: (result) => {
          closeResults.push(result);
        },
      }),
    ).rejects.toMatchObject({
      data: 'unauthorized',
      status: 401,
    });

    expect(closeResults).toHaveLength(1);
    expect(closeResults[0]).toMatchObject({
      error: expect.any(EndpointError),
    });
  });

  it('batches stream events with maxSize and flushes remaining events on close', async () => {
    const batches: Array<Array<EndpointSseEvent<string>>> = [];
    const endpoint = createInstance().use(createSseExtension());

    await endpoint.sse('/chat', {
      eventBuffer: {
        maxDelay: 1000,
        maxSize: 2,
        strategy: 'timeout',
      },
      fetch: batchedSseFetch,
      onBatch: (events) => {
        batches.push(events);
      },
    });

    expect(batches.map((events) => events.map((event) => event.data))).toEqual([
      ['one', 'two'],
      ['three'],
    ]);
  });
});
