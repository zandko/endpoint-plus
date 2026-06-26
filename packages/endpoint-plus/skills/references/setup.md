# Setup

## Table of Contents

- [Install](#install)
- [Core Instance](#core-instance)
- [Transports](#transports)
- [SSR / Server-Side](#ssr--server-side)
- [Project Files](#project-files)

## Install

Use the project's package manager (check lockfile first).

```sh
# runtime
pnpm add @yw/endpoint-plus

# dev only — Vite DevTools + type generation
pnpm add -D @yw/endpoint-plus-devtools quicktype-core

# optional — only if axios transport is needed
pnpm add axios
```

`quicktype-core` and `axios` are optional peer dependencies. Install them only when the project uses DevTools type generation or the axios transport subpath.

## Core Instance

```ts
import { createFetchTransport, createInstance } from '@yw/endpoint-plus';

export const endpoint = createInstance({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
});

endpoint.setTransport(createFetchTransport());
```

`request()` returns transport `data` by default. Envelope normalization (`{ code, message, data }`) is opt-in via `createEnvelopeAdapterPlugin` — see [plugins.md](plugins.md).

Move `/api/v1` into `baseURL` to keep call paths and route keys short:

```ts
createInstance({ baseURL: '/api/v1' });
// then: endpoint.get('/users') → route key is 'GET /users'
```

## Transports

### Fetch (default)

Use for browsers, Node.js 22+, and SSR runtimes with standards-compatible fetch.

```ts
import { createFetchTransport } from '@yw/endpoint-plus';

endpoint.setTransport(createFetchTransport());
```

Pass an explicit fetch when the runtime requires it:

```ts
endpoint.setTransport(createFetchTransport({ fetch: event.fetch }));
```

`createFetchTransport` is also exported from `@yw/endpoint-plus` directly.

### Axios

Use only when the project already depends on axios-specific behavior.

```ts
import { createAxiosTransport } from '@yw/endpoint-plus/transports/axios';

endpoint.setTransport(createAxiosTransport());
```

`axios` must be installed in the consuming project before importing this subpath.

### Miniapp

```ts
import { createMiniappTransport } from '@yw/endpoint-plus/transports/miniapp';
```

Use the miniapp subpath for miniapp runtimes. Inspect the package exports for available helpers.

## SSR / Server-Side

Create one endpoint instance per request when any of these are request-scoped:

- access token / cookies
- user identity
- cache store
- trace ID / observability context
- framework-provided fetch

```ts
import { createFetchTransport, createInstance } from '@yw/endpoint-plus';
import { createAuthTokenPlugin } from '@yw/endpoint-plus/plugins/auth-token';

export function createServerEndpoint(event: { fetch: typeof fetch; token?: string }) {
  const endpoint = createInstance({ baseURL: process.env.API_BASE_URL });
  endpoint.setTransport(createFetchTransport({ fetch: event.fetch }));
  endpoint.use(createAuthTokenPlugin({ getToken: () => event.token ?? null }));
  return endpoint;
}
```

Never use module-level singletons that capture one user's token or cache for another request.

## Project Files

Adapt to existing conventions first. If none exist:

```text
src/shared/endpoint.ts                        # instance + plugins
src/api/user.ts, src/api/order.ts, ...        # independent API functions
src/types/endpoint-plus.generated.d.ts        # DevTools generated types
```
