# Example: SSR-Safe Endpoint Setup

Use this for Nuxt, Next, or other server-side runtimes where tokens, cookies, fetch, or cache are request-scoped.

## Rule

Create one endpoint instance per request. Do not store user token/cache in a module-level singleton.

## Server Factory

```ts
// src/server/create-endpoint.ts
import { createFetchTransport, createInstance } from '@yw/endpoint-plus';
import { createAuthTokenPlugin } from '@yw/endpoint-plus/plugins/auth-token';

export interface ServerEndpointContext {
  fetch: typeof fetch;
  token?: string | null;
  traceId?: string;
}

export function createServerEndpoint(context: ServerEndpointContext) {
  const endpoint = createInstance({
    baseURL: process.env.API_BASE_URL,
    timeout: 15_000,
    headers: context.traceId ? { 'x-trace-id': context.traceId } : undefined,
  });

  endpoint.setTransport(createFetchTransport({ fetch: context.fetch }));
  endpoint.use(createAuthTokenPlugin({ getToken: () => context.token ?? null }));

  return endpoint;
}
```

## Usage

```ts
export async function loadUser(event: { fetch: typeof fetch; token?: string }) {
  const endpoint = createServerEndpoint(event);
  return endpoint.get('/users/me');
}
```

## Bad Pattern

```ts
// Bad: captures request-scoped state in module singleton
export const endpoint = createInstance({ baseURL: process.env.API_BASE_URL });
endpoint.use(createAuthTokenPlugin({ getToken: () => currentRequestToken }));
```

This can leak one user's token or cache into another user's request.
