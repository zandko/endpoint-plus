import { describe, expect, it } from 'vitest';
import {
  createFetchTransport,
  createInstance,
  type InternalEndpointRequestConfig,
} from '../../index';

describe('transport', () => {
  it('supports the built-in fetch transport', async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchTransport = createFetchTransport({
      fetch: async (input, init) => {
        calls.push([input, init]);
        return new Response(JSON.stringify({ code: 20000, data: { id: 1 } }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        });
      },
    });
    const endpoint = createInstance({ baseURL: 'https://api.example.com' });

    endpoint.setTransport(fetchTransport);

    await expect(endpoint.get('/users', { params: { page: 1 } })).resolves.toEqual({
      code: 20000,
      data: { id: 1 },
    });
    expect(String(calls[0]?.[0])).toBe('https://api.example.com/users?page=1');
    expect(calls[0]?.[1]?.method).toBe('GET');
  });

  it('supports user-provided transports for axios or other clients', async () => {
    const calls: InternalEndpointRequestConfig[] = [];
    const endpoint = createInstance({ baseURL: 'https://api.example.com' });

    endpoint.setTransport({
      async request(config) {
        calls.push(config);
        return {
          config,
          data: { code: 20000, data: { ok: true } },
          status: 200,
        };
      },
    });

    await expect(endpoint.post('/submit', { name: 'yw' })).resolves.toEqual({
      code: 20000,
      data: { ok: true },
    });
    expect(calls[0]).toMatchObject({
      baseURL: 'https://api.example.com',
      data: { name: 'yw' },
      method: 'POST',
      url: '/submit',
    });
  });
});
