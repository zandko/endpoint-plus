import { describe, expect, it } from 'vitest';
import {
  createInstance,
  type EndpointTransportResponse,
  type InternalEndpointRequestConfig,
} from '../../index';
import { createWorkflowExtension } from '../../extensions/workflow';
import { MemoryTransport } from '../test-utils';

describe('workflow extension', () => {
  it('runs request groups in parallel with all', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance().use(createWorkflowExtension());

    transport.enqueue(createResponse({ id: 1 }));
    transport.enqueue(createResponse({ id: 2 }));
    endpoint.setTransport(transport);

    await expect(endpoint.all([{ url: '/one' }, { url: '/two' }])).resolves.toEqual([
      { id: 1 },
      { id: 2 },
    ]);
    expect(transport.requests.map((request) => request.url)).toEqual(['/one', '/two']);
  });

  it('runs request groups sequentially with sequence', async () => {
    const order: string[] = [];
    const endpoint = createInstance().use(createWorkflowExtension());

    endpoint.setTransport({
      async request(config) {
        order.push(`start:${config.url}`);
        await Promise.resolve();
        order.push(`end:${config.url}`);

        return {
          config,
          data: { url: config.url },
          status: 200,
        };
      },
    });

    await expect(endpoint.sequence([{ url: '/one' }, { url: '/two' }])).resolves.toEqual([
      { url: '/one' },
      { url: '/two' },
    ]);
    expect(order).toEqual(['start:/one', 'end:/one', 'start:/two', 'end:/two']);
  });

  it('runs value pipeline steps with access to the endpoint client', async () => {
    const transport = new MemoryTransport();
    const endpoint = createInstance().use(createWorkflowExtension());

    transport.enqueue(createResponse({ id: 3 }));
    endpoint.setTransport(transport);

    await expect(
      endpoint.pipeline(1, [
        (value) => Number(value) + 1,
        async (value, client) => {
          const response = await client.get<{ id: number }>('/audit');
          return Number(value) + response.id;
        },
      ]),
    ).resolves.toBe(5);
    expect(transport.requests[0]?.url).toBe('/audit');
  });
});

function createResponse(data: unknown): EndpointTransportResponse {
  return {
    config: {} as InternalEndpointRequestConfig,
    data,
    status: 200,
  };
}
