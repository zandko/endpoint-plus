import { describe, expect, it } from 'vitest';
import { createInstance } from '../../index';
import { createMiniappTransport, type MiniappRequestOptions } from '../../miniapp';

describe('miniapp transports', () => {
  it('maps endpoint requests to wx.request options', async () => {
    const calls: MiniappRequestOptions[] = [];
    const endpoint = createInstance({ baseURL: 'https://api.example.com' });

    endpoint.setTransport(
      createMiniappTransport({
        request(options) {
          calls.push(options);
          options.success?.({
            data: { ok: true },
            header: { 'x-trace': '1' },
            statusCode: 200,
          });
          return {
            abort() {},
          };
        },
      }),
    );

    await expect(
      endpoint.post('/submit', { name: 'yw' }, { params: { page: 1 } }),
    ).resolves.toEqual({
      ok: true,
    });
    expect(calls[0]).toMatchObject({
      data: { name: 'yw' },
      method: 'POST',
      url: 'https://api.example.com/submit?page=1',
    });
  });

  it('normalizes uni.request HTTP status errors', async () => {
    const endpoint = createInstance();

    endpoint.setTransport(
      createMiniappTransport({
        runtime: {
          request(options) {
            options.success?.({
              data: { message: 'server error' },
              statusCode: 500,
            });
          },
        },
      }),
    );

    await expect(endpoint.get('/broken')).rejects.toMatchObject({
      config: expect.objectContaining({ url: '/broken' }),
      data: { message: 'server error' },
    });
  });
});
