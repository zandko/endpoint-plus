import { describe, expect, it } from 'vitest';
import { scanSource } from './scan.ts';

describe('route scanner', () => {
  it('extracts literal endpoint method calls', () => {
    expect(scanSource("client.get('/api/users')", 'demo.ts')).toMatchObject([
      {
        id: 'GET /api/users',
        responseTypeName: 'GETUsersResponse',
      },
    ]);
  });

  it('extracts template literal endpoint method calls with named params', () => {
    const routes = scanSource('client.get(`/api/users/${userId}/orders/${order.id}`)', 'demo.ts');

    expect(routes).toMatchObject([
      {
        id: 'GET /api/users/:userId/orders/:orderId',
        responseTypeName: 'GETUsersByUserIDOrdersByOrderIDResponse',
      },
    ]);
  });

  it('extracts endpoint.request object calls', () => {
    expect(
      scanSource("endpoint.request({ method: 'PUT', url: `/api/users/${userId}` })", 'demo.ts'),
    ).toMatchObject([
      {
        id: 'PUT /api/users/:userId',
      },
    ]);
  });

  it('uses the previous collection segment when a template expression name is generic', () => {
    expect(scanSource('client.get(`/api/orders/${id}`)', 'demo.ts')).toMatchObject([
      {
        id: 'GET /api/orders/:orderId',
      },
    ]);
  });

  it('extracts calls from Vue script setup blocks', () => {
    const routes = scanSource(
      `<script setup lang="ts">
      endpoint.get(\`/api/users/\${userId}/orders\`)
      </script>
      <template><div /></template>`,
      'Demo.vue',
    );

    expect(routes).toMatchObject([
      {
        id: 'GET /api/users/:userId/orders',
      },
    ]);
  });
});
