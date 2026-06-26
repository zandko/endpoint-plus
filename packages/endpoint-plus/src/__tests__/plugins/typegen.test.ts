import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createInstance,
  type EndpointTransport,
  type InternalEndpointRequestConfig,
} from '../../index';
import { TYPEGEN_PLUGIN, createTypegenPlugin } from '../../plugins/typegen';

describe('typegen-plugin', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes a stable symbol plugin id', () => {
    expect(createTypegenPlugin().id).toBe(TYPEGEN_PLUGIN);
  });

  it('does nothing unless a request explicitly enables typegen', async () => {
    const output = vi.fn<(code: string, meta: unknown) => void>();
    const endpoint = createInstance().use(createTypegenPlugin({ output }));
    endpoint.setTransport(new EchoTransport({ id: 1 }));

    await expect(endpoint.get('/users/1')).resolves.toEqual({ id: 1 });
    expect(output).not.toHaveBeenCalled();
  });

  it('generates TypeScript for one enabled request', async () => {
    const output = vi.fn<(code: string, meta: unknown) => void>();
    const endpoint = createInstance().use(createTypegenPlugin({ output }));
    endpoint.setTransport(
      new EchoTransport({
        id: 1,
        name: 'Ada',
        roles: ['admin'],
      }),
    );

    await endpoint.get('/users/1', {
      extensions: {
        typegen: {
          name: 'UserDetailResponse',
        },
      },
    });

    expect(output).toHaveBeenCalledOnce();
    const [code, meta] = output.mock.calls[0]!;
    expect(meta).toMatchObject({
      method: 'GET',
      name: 'UserDetailResponse',
      url: '/users/1',
    });
    expect(code).toContain('export interface UserDetailResponse');
    expect(code).toContain('id:');
    expect(code).toContain('number');
    expect(code).toContain('roles:');
    expect(code).toContain('string[]');
  });

  it('supports selecting nested response data', async () => {
    const output = vi.fn<(code: string, meta: unknown) => void>();
    const endpoint = createInstance().use(createTypegenPlugin({ output }));
    endpoint.setTransport(
      new EchoTransport({
        code: 200,
        data: {
          id: 'u1',
        },
      }),
    );

    await endpoint.get('/profile', {
      extensions: {
        typegen: {
          name: 'ProfileResponse',
          select: (response) => (response.data as { data: unknown }).data,
        },
      },
    });

    const [code] = output.mock.calls[0]!;
    expect(code).toContain('export interface ProfileResponse');
    expect(code).toContain('id:');
    expect(code).toContain('string');
    expect(code).not.toContain('code:');
  });

  it('prints to console when console output is requested', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const endpoint = createInstance().use(createTypegenPlugin({ output: 'console' }));
    endpoint.setTransport(new EchoTransport({ ok: true }));

    await endpoint.get('/health', {
      extensions: {
        typegen: true,
      },
    });

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('[endpoint-plus:typegen] GET /health'),
    );
    expect(log).toHaveBeenCalledWith(expect.stringContaining('export interface GetHealthResponse'));
  });

  it.each([
    ['/api/users', 'GetUsersResponse'],
    ['/api/users/1', 'GetUsersByIDResponse'],
    ['/api/users/:id', 'GetUsersByIDResponse'],
    ['/api/users/{id}', 'GetUsersByIDResponse'],
    ['/api/users/[id]', 'GetUsersByIDResponse'],
    ['/api/users/1/orders', 'GetUsersByIDOrdersResponse'],
    ['/api/users/1/orders/2', 'GetUsersByIDOrdersByIDResponse'],
    ['/api/v1/users', 'GetUsersResponse'],
    ['/v2/users?page=1', 'GetUsersResponse'],
    ['https://example.com/api/users/1', 'GetUsersByIDResponse'],
    ['/api/users/550e8400-e29b-41d4-a716-446655440000', 'GetUsersByIDResponse'],
    ['/api/orgs/:orgId/users/:userId', 'GetOrgsByOrgIDUsersByUserIDResponse'],
  ])('infers stable default type name for %s', async (url, name) => {
    const output = vi.fn<(code: string, meta: unknown) => void>();
    const endpoint = createInstance().use(createTypegenPlugin({ output }));
    endpoint.setTransport(new EchoTransport({ ok: true }));

    await endpoint.get(url, {
      extensions: {
        typegen: true,
      },
    });

    const [code, meta] = output.mock.calls[0]!;
    expect(meta).toMatchObject({ name, url });
    expect(code).toContain(`export interface ${name}`);
  });
});

class EchoTransport implements EndpointTransport {
  constructor(private data: unknown) {}

  async request(config: InternalEndpointRequestConfig) {
    return {
      config,
      data: this.data,
      status: 200,
    };
  }
}
