import { describe, expect, it } from 'vitest';
import { createInstance } from '../../index';
import { AUTH_TOKEN_PLUGIN, createAuthTokenPlugin } from '../../plugins/auth-token';
import { MemoryTransport } from '../test-utils';

describe('auth-token-plugin', () => {
  it('exposes stable symbol plugin ids', () => {
    expect(createAuthTokenPlugin().id).toBe(AUTH_TOKEN_PLUGIN);
  });

  it('injects authorization and returns normalized data by default', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance({
      requireAuth: true,
    })
      .use(createAuthTokenPlugin({ getToken: () => 'token' }));

    endpoint.setTransport(transport);

    const result = await endpoint.get<{ code: number; data: { ok: boolean }; message: string }>('/profile');

    expect(result).toEqual({ code: 20000, data: { ok: true }, message: 'ok' });
    expect(transport.requests[0]?.headers.Authorization).toBe('Bearer token');
  });
});
