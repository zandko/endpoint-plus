# Plugins

## Table of Contents

- [Minimal Setup](#minimal-setup)
- [Auth Token](#auth-token)
- [Refresh Token](#refresh-token)
- [Retry](#retry)
- [Request Cache](#request-cache)
- [Request Gate](#request-gate)
- [Observability](#observability)
- [Typegen Plugin](#typegen-plugin)
- [Plugin vs Extension](#plugin-vs-extension)

## Minimal Setup

Start with only what the project needs. Add plugins selectively.

```ts
import { createInstance, createFetchTransport } from '@yw/endpoint-plus';
import { createAuthTokenPlugin } from '@yw/endpoint-plus/plugins/auth-token';

export const endpoint = createInstance({ baseURL: import.meta.env.VITE_API_BASE_URL });
endpoint.setTransport(createFetchTransport());

// Add auth if the project calls authenticated APIs
endpoint.use(createAuthTokenPlugin({ getToken: () => tokenStore.accessToken }));
```

Common additions:
- **retry** — transient network/server failures
- **refresh-token** — 401 replay with token refresh
- **request-cache** — GET/HEAD memory caching and in-flight dedupe
- **request-gate** — per-request dedupe, debounce, throttle
- **observability** — request duration and error telemetry

## Auth Token

```ts
import { createAuthTokenPlugin } from '@yw/endpoint-plus/plugins/auth-token';

endpoint.use(createAuthTokenPlugin({
  getToken: () => tokenStore.accessToken,
}));
```

Options:

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `getToken` | `string \| (config) => Awaitable<string \| null>` | — | Read token; use function for SSR request-scoped access |
| `headerName` | `string` | `'Authorization'` | Header name |
| `headerPrefix` | `string` | `'Bearer '` | Header value prefix |
| `shouldAuthenticate` | `(config) => boolean` | — | Skip auth for specific requests |

In SSR, do not read `localStorage`. Pass the token through request context.

## Refresh Token

```ts
import { createRefreshTokenPlugin } from '@yw/endpoint-plus/plugins/refresh-token';

endpoint.use(createRefreshTokenPlugin<{ accessToken: string }>({
  refreshRequest: { method: 'POST', url: '/auth/refresh' },
  getAccessToken: () => tokenStore.accessToken,
  resolveAccessToken: (result) => result.accessToken,
  onRefresh: (result) => { tokenStore.setAccessToken(result.accessToken); },
  shouldRefresh: (error) => isUnauthorizedError(error),
}));
```

Options:

| Option | Type | Purpose |
|--------|------|---------|
| `refreshRequest` | `EndpointRequestConfig \| (ctx) => Awaitable<EndpointRequestConfig>` | How to call the refresh endpoint |
| `getAccessToken` | `() => Awaitable<string \| null>` | Read current access token |
| `resolveAccessToken` | `(result) => string \| null` | Extract new token from refresh response |
| `onRefresh` | `(result) => Awaitable<void>` | Persist new token after refresh |
| `shouldRefresh` | `(error) => boolean` | Decide whether to attempt refresh |

Ensure failed refresh does not loop forever. `shouldRefresh` should return `false` for refresh-endpoint errors.


## Retry

```ts
import { createRetryPlugin } from '@yw/endpoint-plus/plugins/retry';

endpoint.use(createRetryPlugin({ retries: 2, delay: 300 }));
```

Keep retries conservative for non-idempotent methods unless the business operation is safe to replay.

## Request Cache

```ts
import { createRequestCachePlugin } from '@yw/endpoint-plus/plugins/request-cache';

endpoint.use(createRequestCachePlugin({ ttl: 30_000 }));
```

Use for GET/HEAD memory caching and in-flight dedupe. In SSR, do not share cache stores across users unless cache keys include tenant/user boundaries.

## Request Gate

```ts
import { createRequestGatePlugin } from '@yw/endpoint-plus/plugins/request-gate';

endpoint.use(createRequestGatePlugin());
```

Use for per-request dedupe, debounce, and throttle. Good for preventing duplicate submissions or high-frequency search calls.

## Observability

```ts
import { createObservabilityPlugin } from '@yw/endpoint-plus/plugins/observability';

endpoint.use(createObservabilityPlugin({
  onRequest: ({ request, startedAt }) => {
    logger.debug('request:start', { method: request.method, url: request.url });
  },
  onResponse: ({ duration, request, response }) => {
    logger.info('request:done', { duration, method: request.method, status: response.status });
  },
  onError: ({ duration, error, request }) => {
    logger.error('request:error', { duration, method: request.method, error });
  },
}));
```

Keep callbacks side-effect-safe and avoid leaking sensitive headers or tokens.

## Typegen Plugin

Use runtime typegen for capturing one response sample. For Vite business projects, prefer `@yw/endpoint-plus-devtools` for route catalog + batch type generation.

```ts
import { createTypegenPlugin } from '@yw/endpoint-plus/plugins/typegen';

endpoint.use(createTypegenPlugin({ enabled: import.meta.env.DEV, output: 'console' }));

await endpoint.get('/profile', {
  extensions: { typegen: { name: 'GetProfileResponse' } },
});
```

## Plugin vs Extension

Plugins participate in the request lifecycle. They may register request interceptors, request middlewares, or response interceptors. Extensions add new methods to the client instance.

| Kind | Adds client methods | Registers lifecycle hooks | Example |
|------|---------------------|---------------------------|---------|
| Plugin | No | Yes | `createRetryPlugin()` |
| Extension | Yes | No | `createSseExtension()` |

For built-in extension methods (`poll`, `longPoll`, `sse`, `all`, `sequence`, `pipeline`), read `${CURRENT_SKILL_PATH}/references/extensions.md`.

For custom plugin and custom extension authoring, read `${CURRENT_SKILL_PATH}/references/customization.md`.
