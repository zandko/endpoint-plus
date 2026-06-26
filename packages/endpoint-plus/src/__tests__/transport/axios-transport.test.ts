import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { createInstance } from '../../index';
import { createAxiosTransport } from '../../transport/axios';

describe('axios transport', () => {
  it('maps endpoint requests to axios requests', async () => {
    const calls: AxiosRequestConfig[] = [];
    const client = {
      async request(config: AxiosRequestConfig): Promise<AxiosResponse> {
        calls.push(config);
        return {
          config,
          data: { ok: true },
          headers: { 'x-trace': '1' },
          status: 200,
          statusText: 'OK',
        } as AxiosResponse;
      },
    } as AxiosInstance;
    const endpoint = createInstance({ baseURL: 'https://api.example.com' });

    endpoint.setTransport(createAxiosTransport({ client }));

    await expect(endpoint.post('/submit', { name: 'yw' })).resolves.toEqual({ ok: true });
    expect(calls[0]).toMatchObject({
      baseURL: 'https://api.example.com',
      data: { name: 'yw' },
      method: 'POST',
      url: '/submit',
    });
  });

  it('normalizes axios response errors', async () => {
    const client = {
      async request(config: AxiosRequestConfig): Promise<AxiosResponse> {
        throw {
          isAxiosError: true,
          message: 'Request failed',
          response: {
            config,
            data: { message: 'unauthorized' },
            headers: { 'content-type': 'application/json' },
            status: 401,
            statusText: 'Unauthorized',
          },
        };
      },
    } as AxiosInstance;
    const endpoint = createInstance();

    endpoint.setTransport(createAxiosTransport({ client }));

    await expect(endpoint.get('/secure')).rejects.toMatchObject({
      config: expect.objectContaining({ url: '/secure' }),
      data: { message: 'unauthorized' },
    });
  });
});
