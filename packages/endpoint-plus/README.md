# endpoint-plus

Universal request SDK for frontend and JavaScript runtime projects.

## Features

- Runtime-safe fetch transport for browsers, Node.js, and SSR fetch implementations.
- Transport boundary for custom request clients.
- Request config inherits `ofetch` options such as `retry`, `retryDelay`, `retryStatusCodes`, `timeout`, `parseResponse`, and hooks.
- Request/response interceptors, opt-in feature extensions, and runtime-specific file helpers.
- Optional plugins for authorization, refresh token replay, and common `code/message/data` response normalization.

## Install

```sh
pnpm add endpoint-plus
```

Optional transports are installed by the consuming project:

```sh
pnpm add axios
```

Use `axios` only when importing `endpoint-plus/transports/axios`.

## Architecture

The SDK is split into clear runtime boundaries:

- `client` - request lifecycle, defaults, interceptors, plugins, and opt-in extensions.
- `transports` - runtime-specific request execution. The root entry includes a standards-based fetch transport; axios and miniapp transports use dedicated subpaths.
- `browser`, `node`, and `miniapp` - runtime capabilities that should not live on the core client.
- `plugins` - opt-in behaviors such as auth token injection and response normalization.
- `extensions` - opt-in client methods such as polling, SSE streaming, and request workflows.
- `runtime` and `shared` - internal implementation modules. They are not public entry points.

The core client does not normalize response envelopes by default. It returns transport `data` unless a plugin transforms the response.

## Public Entry Points

Import from the smallest entry that contains the feature you need:

| Entry                                        | Purpose                                                   |
| -------------------------------------------- | --------------------------------------------------------- |
| `endpoint-plus`                          | Core client, fetch transport, core types, `EndpointError` |
| `endpoint-plus/extensions/polling`       | `poll()` and `longPoll()` methods                         |
| `endpoint-plus/extensions/sse`           | `sse()` method and SSE types                              |
| `endpoint-plus/extensions/workflow`      | `all()`, `sequence()`, and `pipeline()` helpers           |
| `endpoint-plus/plugins/auth-token`       | Authorization header injection                            |
| `endpoint-plus/plugins/observability`    | Request lifecycle telemetry                               |
| `endpoint-plus/plugins/refresh-token`    | Token refresh and failed request replay                   |
| `endpoint-plus/plugins/request-cache`    | GET/HEAD memory cache and in-flight dedupe                |
| `endpoint-plus/plugins/request-gate`     | Per-request dedupe, debounce, and throttle                |
| `endpoint-plus/plugins/retry`            | Retry middleware                                          |
| `endpoint-plus/plugins/typegen`          | Dev-only TypeScript generation from one response sample   |
| `endpoint-plus/transports/axios`         | Axios transport                                           |
| `endpoint-plus/transports/fetch`         | Fetch transport subpath                                   |
| `endpoint-plus/transports/miniapp`       | Pure miniapp transport                                    |
| `endpoint-plus/browser`                  | Browser upload/download helpers                           |
| `endpoint-plus/node`                     | Node upload/download helpers                              |
| `endpoint-plus/miniapp`                  | Miniapp transport plus file helpers                       |

## Fetch Usage

```ts
import { createFetchTransport, createInstance } from 'endpoint-plus';
import { createAuthTokenPlugin } from 'endpoint-plus/plugins/auth-token';
import { createObservabilityPlugin } from 'endpoint-plus/plugins/observability';
import { createRequestCachePlugin } from 'endpoint-plus/plugins/request-cache';
import { createRequestGatePlugin } from 'endpoint-plus/plugins/request-gate';
import { createTypegenPlugin } from 'endpoint-plus/plugins/typegen';

const endpoint = createInstance({
  baseURL: 'https://api.example.com',
});

endpoint.setTransport(createFetchTransport());
endpoint.use(
  createObservabilityPlugin({
    onResponse: ({ duration, request, response }) => {
      console.log(request.method, request.url, response.status, duration);
    },
  }),
);
endpoint.use(
  createAuthTokenPlugin({
    getToken: () => localStorage.getItem('access_token'),
  }),
);
endpoint.use(createRequestGatePlugin());
endpoint.use(createRequestCachePlugin({ ttl: 30_000 }));
endpoint.use(createTypegenPlugin({ enabled: import.meta.env.DEV }));

export const getProfile = () => endpoint.get('/profile');
export const getProfileType = () =>
  endpoint.get('/profile', {
    extensions: {
      typegen: { name: 'ProfileResponse' },
    },
  });

Workflow helpers are opt-in:

```ts
import { createWorkflowExtension } from 'endpoint-plus/extensions/workflow';

const endpointWithWorkflow = endpoint.use(createWorkflowExtension());

await endpointWithWorkflow.all([{ url: '/profile' }, { url: '/settings' }]);
```

For the best TypeScript inference, assign the return value of `.use()` when installing an extension:

```ts
const endpointWithPolling = endpoint.use(createPollingExtension());

await endpointWithPolling.poll('/jobs/1');
```

Calling `endpoint.use(createPollingExtension())` without assigning the return value still installs the methods at runtime, but the original variable type remains the core client type.

## Transport Options

### Browser, Nuxt, Next, and Node.js Fetch

```ts
endpoint.setTransport(createFetchTransport());
```

Node.js 22+, modern SSR runtimes, and browsers provide global `fetch`. For `node-fetch`, pass the function explicitly:

```ts
endpoint.setTransport(createFetchTransport({ fetch: nodeFetch }));
```

For Nuxt or Next server code, create one endpoint instance per request when defaults, auth, cache store, or observability context depend on the current user:

```ts
export function createServerEndpoint(event: { fetch: typeof fetch; token?: string }) {
  const endpoint = createInstance({ baseURL: 'https://api.example.com' });

  endpoint.setTransport(createFetchTransport({ fetch: event.fetch }));
  endpoint.use(
    createAuthTokenPlugin({
      getToken: () => event.token ?? null,
    }),
  );

  return endpoint;
}
```

Avoid sharing request-scoped tokens or cache stores in a process-level singleton.

### Axios

```ts
import { createAxiosTransport } from 'endpoint-plus/transports/axios';

endpoint.setTransport(createAxiosTransport());
```

`axios` is an optional peer dependency. Install it only in projects that use the axios transport.

Axios projects can pass native upload/download progress handlers through request config:

```ts
await endpoint.post('/upload', formData, {
  onUploadProgress: ({ loaded, total }) => {
    console.log(loaded, total);
  },
});
```

The fetch transport does not fake upload progress because standard fetch does not expose it reliably. Use axios or a custom transport when progress accuracy is required.

### Mini Program Runtimes

Use the miniapp runtime entry for native WeChat Mini Program and uni-app projects:

```ts
import { createMiniappTransport } from 'endpoint-plus/miniapp';

endpoint.setTransport(createMiniappTransport({ runtime: wx }));
```

```ts
import { createMiniappTransport } from 'endpoint-plus/miniapp';

endpoint.setTransport(createMiniappTransport({ runtime: uni }));
```

The miniapp transport accepts any runtime with a `request(options)` API compatible with `wx.request` or `uni.request`. The SDK does not depend on WeChat or uni-app packages; pass the runtime object from the consuming project.

`endpoint-plus/transports/miniapp` remains the pure transport subpath. `endpoint-plus/miniapp` is the miniapp runtime capability entry and also exports upload/download helpers.

## Runtime Capabilities

Core request methods (`request`, `get`, `post`, `put`, `patch`, `delete`) stay on the client. Feature methods are installed through extension subpaths:

| Capability              | Browser                     | Node 22+                 | SSR                 | Miniapp                     |
| ----------------------- | --------------------------- | ------------------------ | ------------------- | --------------------------- |
| Fetch transport         | Yes                         | Yes                      | Yes                 | No                          |
| Axios transport         | Yes                         | Yes                      | Yes                 | No                          |
| Miniapp transport       | No                          | No                       | No                  | Yes                         |
| SSE extension           | Yes                         | Yes                      | Server runtime only | No                          |
| Polling extension       | Yes                         | Yes                      | Yes                 | Yes                         |
| Runtime upload helper   | `endpoint-plus/browser` | `endpoint-plus/node` | Server runtime only | `endpoint-plus/miniapp` |
| Runtime download helper | `endpoint-plus/browser` | `endpoint-plus/node` | Server runtime only | `endpoint-plus/miniapp` |

## Extensions

Extensions add methods to a client instance through `.use()` and are exported from dedicated subpaths:

```ts
import { createPollingExtension } from 'endpoint-plus/extensions/polling';
import { createSseExtension } from 'endpoint-plus/extensions/sse';

const endpoint = createInstance().use(createPollingExtension()).use(createSseExtension());

await endpoint.poll('/jobs/1', {
  interval: 1000,
  stopCondition: (job) => job.done,
});
```

Extensions are not request lifecycle plugins. They add methods to a client instance and do not register interceptors or middleware.

### Polling

```ts
import { createPollingExtension } from 'endpoint-plus/extensions/polling';

const endpoint = createInstance().use(createPollingExtension());

const job = await endpoint.poll<{ done: boolean }>('/jobs/1', {
  interval: 1000,
  maxAttempts: 20,
  stopCondition: (response) => response.done,
});
```

`poll()` repeatedly sends `GET` requests until `stopCondition` returns `true` or `maxAttempts` is reached.

`longPoll()` keeps requesting until the optional signal aborts or `stopCondition` returns `true`:

```ts
const controller = new AbortController();

await endpoint.longPoll(
  '/notifications',
  async (message) => {
    console.log(message);
  },
  {
    interval: 3000,
    signal: controller.signal,
    stopCondition: (message) => message.done === true,
  },
);
```

### Workflow

```ts
import { createWorkflowExtension } from 'endpoint-plus/extensions/workflow';

const endpoint = createInstance().use(createWorkflowExtension());

const [profile, settings] = await endpoint.all([{ url: '/profile' }, { url: '/settings' }]);

const ordered = await endpoint.sequence([{ url: '/step-one' }, { url: '/step-two' }]);

const result = await endpoint.pipeline(1, [
  (value) => Number(value) + 1,
  async (value, client) => {
    await client.get('/audit');
    return Number(value) * 2;
  },
]);
```

Use workflow helpers for request orchestration. Keep business-specific orchestration in the consuming project when it grows beyond simple request sequencing.

## Plugins

Plugins are exported from dedicated plugin subpaths:

```ts
import { createRetryPlugin } from 'endpoint-plus/plugins/retry';
```

Import only the plugin you need, for example `endpoint-plus/plugins/auth-token`. The root entry stays focused on the core client.

Plugins participate in the request lifecycle. They may register request interceptors, request middlewares, or response interceptors. Extension methods and plugin options both use `.use()`, but they serve different purposes:

| Kind      | Adds client methods | Registers lifecycle hooks | Example                |
| --------- | ------------------- | ------------------------- | ---------------------- |
| Extension | Yes                 | No                        | `createSseExtension()` |
| Plugin    | No                  | Yes                       | `createRetryPlugin()`  |

### Auth Token

```ts
import { createAuthTokenPlugin } from 'endpoint-plus/plugins/auth-token';

endpoint.use(
  createAuthTokenPlugin({
    getToken: async () => session.accessToken,
    shouldAuthenticate: (config) => config.requireAuth === true,
  }),
);
```

Token storage is intentionally external. SPA, Nuxt, Next, and Node services can read from local storage, cookies, request context, or server session without coupling that policy to the SDK.

### Request Gate

```ts
import { createRequestGatePlugin } from 'endpoint-plus/plugins/request-gate';

endpoint.use(createRequestGatePlugin());
```

Use request gate for interaction-level request control. It is per request by design:

```ts
await endpoint.get('/users', {
  params: { keyword },
  extensions: {
    requestGate: {
      key: 'user-search',
      mode: 'debounce',
      wait: 300,
    },
  },
});
```

Supported modes are `dedupe`, `debounce`, and `throttle`. `dedupe` can reuse the in-flight response or reject duplicate submissions:

```ts
await endpoint.post('/submit', form, {
  extensions: {
    requestGate: {
      behavior: 'reject',
      key: 'submit-form',
      mode: 'dedupe',
    },
  },
});
```

Request cancellation uses the standard `AbortController` API:

```ts
const controller = new AbortController();

const request = endpoint.get('/users', {
  signal: controller.signal,
});

controller.abort();
await request;
```

### Request Cache

```ts
import { createRequestCachePlugin } from 'endpoint-plus/plugins/request-cache';

endpoint.use(
  createRequestCachePlugin({
    ttl: 30_000,
  }),
);
```

The cache plugin is opt-in and only handles `GET` and `HEAD` by default. Concurrent requests with the same key are deduped with `dedupe: 'in-flight'`. Disable per request with `extensions: { requestCache: false }`. For SSR, pass a per-request `store` to avoid sharing cached responses across users.

### Retry

```ts
import { createRetryPlugin } from 'endpoint-plus/plugins/retry';

endpoint.use(
  createRetryPlugin({
    delay: 300,
    retries: 2,
    statusCodes: [408, 429, 500, 502, 503, 504],
  }),
);
```

Retry is opt-in and applies to `GET`, `HEAD`, and `OPTIONS` by default. It does not retry `401` by default, so refresh-token handling remains separate. Disable retries for a request with `context: { disableRetry: true }`.

Plugin registration order is meaningful. Request interceptors run before request middlewares; middlewares wrap transport in registration order; response interceptors and error interceptors run after transport. A recommended order is observability, auth token, request gate, request cache, retry, and refresh token.

### Typegen

The typegen plugin is a development helper for generating TypeScript from one real endpoint response. Install the plugin globally, then opt in only on the request you want to inspect.

`quicktype-core` is an optional peer dependency. Install it in the consuming project as a dev dependency:

```sh
pnpm add -D quicktype-core
```

```ts
import { createTypegenPlugin } from 'endpoint-plus/plugins/typegen';

endpoint.use(createTypegenPlugin({ enabled: import.meta.env.DEV }));

await endpoint.get('/profile', {
  extensions: {
    typegen: {
      name: 'ProfileResponse',
    },
  },
});
```

The plugin dynamically imports `quicktype-core` only when `extensions.typegen` is enabled for that request. Browser consoles use a collapsed group when available; Node.js and miniapp runtimes use `console.log`. The request result is not transformed.

Use `select` when you want to generate from a nested value:

```ts
await endpoint.get('/profile', {
  extensions: {
    typegen: {
      name: 'ProfileResponse',
      select: (response) => (response.data as { data: unknown }).data,
    },
  },
});
```

### Observability

```ts
import { createObservabilityPlugin } from 'endpoint-plus/plugins/observability';

endpoint.use(
  createObservabilityPlugin({
    onRequest: ({ request }) => {
      logger.debug('request:start', { method: request.method, url: request.url });
    },
    onResponse: ({ duration, request, response }) => {
      logger.info('request:done', {
        duration,
        method: request.method,
        status: response.status,
        url: request.url,
      });
    },
    onError: ({ duration, error, request }) => {
      logger.error('request:error', { duration, error, url: request.url });
    },
  }),
);
```

The plugin observes request lifecycle events and never transforms responses or swallows errors. Keep trace IDs, user/session IDs, and log sinks in the consuming application so SSR and Node services can attach per-request context safely.

### Refresh Token

```ts
import { createRefreshTokenPlugin } from 'endpoint-plus/plugins/refresh-token';

endpoint.use(
  createRefreshTokenPlugin({
    refreshRequest: {
      method: 'POST',
      url: '/session/refresh',
    },
    resolveAccessToken: (session) => session.accessToken,
    onRefresh: async (session) => {
      await saveSession(session);
    },
  }),
);
```

The plugin refreshes once for concurrent unauthorized responses, sends `refreshRequest` with the same endpoint client, writes the new `Authorization` header, and replays the failed request one time. Refresh requests are marked internally so they do not trigger auth injection or recursive refresh handling. Token/session persistence stays in the consuming project.

## Custom Plugins and Extensions

You can extend the SDK by creating custom plugins for lifecycle hooks or extensions for adding new methods to the client instance.

### Custom Plugins

Plugins participate in the request lifecycle. They use `kind: 'plugin'` and must provide a unique `id` (Symbol).

```ts
import { type EndpointPlugin } from 'endpoint-plus';

const MY_PLUGIN_ID = Symbol('my-plugin');

export const createMyPlugin = (options = {}): EndpointPlugin => ({
  id: MY_PLUGIN_ID,
  kind: 'plugin',
  setup(client) {
    // Register a request interceptor (runs before request)
    client.registerRequestInterceptor((config) => {
      config.headers['X-Custom-Header'] = 'value';
      return config;
    });

    // Register a request middleware (Onion model, wraps transport)
    client.registerRequestMiddleware(async (config, next) => {
      const start = Date.now();
      const response = await next(config);
      console.log(`Request to ${config.url} took ${Date.now() - start}ms`);
      return response;
    });

    // Register a response interceptor (runs after response)
    client.registerResponseInterceptor((response) => {
      console.log('Response status:', response.status);
      return response;
    });
  },
});
```

### Custom Extensions

Extensions add new methods to a client instance. They use `kind: 'extension'` and return an object containing the new methods from `setup`.

```ts
import { type EndpointExtension } from 'endpoint-plus';

const MY_EXTENSION_ID = Symbol('my-extension');

export interface MyExtension {
  sayHello(name: string): void;
}

export const createMyExtension = (): EndpointExtension<MyExtension> => ({
  id: MY_EXTENSION_ID,
  kind: 'extension',
  setup(client) {
    return {
      sayHello(name: string) {
        console.log(`Hello, ${name}!`);
        // Extensions can use core client methods
        // await client.get('/greet');
      },
    };
  },
});

// Usage
const endpoint = createInstance().use(createMyExtension());
endpoint.sayHello('World');
```

For the best TypeScript support, extensions should define an interface for the methods they add, and `use()` will return a client instance intersected with that interface.

## Server-Sent Events

Install the SSE extension for AI chat streams, notifications, and other `text/event-stream` endpoints:

```ts
import { createSseExtension } from 'endpoint-plus/extensions/sse';

const endpointWithSse = endpoint.use(createSseExtension());

await endpointWithSse.sse<{ text: string }>('/chat/stream', {
  method: 'POST',
  data: { prompt: 'hello' },
  deserialize: (data) => JSON.parse(data),
  onEvent: ({ event, data }) => {
    console.log(event, data.text);
  },
});
```

SSE requests reuse endpoint defaults, request interceptors, auth token injection, URL params, and body serializers. SSE intentionally bypasses the normal response envelope pipeline because the response is consumed as a stream. Failed stream requests reject with `EndpointError`, and `onClose` runs for both normal completion and stream failures.

SSE requires a fetch implementation with readable response streams. It is suitable for browsers, Node.js 22+, and SSR server runtimes that expose streaming fetch. It is not supported by the miniapp transport.

For high-frequency AI token streams, batch UI updates with `eventBuffer`:

```ts
await endpointWithSse.sse<string>('/chat/stream', {
  eventBuffer: {
    maxDelay: 16,
    maxSize: 50,
    strategy: 'animation-frame',
  },
  onBatch: (events) => {
    appendTokens(events.map((event) => event.data).join(''));
  },
});
```

`maxDelay` controls how long events may wait before flushing. `maxSize` controls how many events can be processed in one batch. The SDK flushes remaining buffered events when the stream ends or fails.

## Error Handling

All transport failures are normalized to `EndpointError`:

```ts
import { EndpointError } from 'endpoint-plus';

try {
  await endpoint.get('/secure');
} catch (error) {
  if (error instanceof EndpointError) {
    console.log(error.status, error.headers, error.data);
  }
}
```

`EndpointError` keeps the original `cause`, request `config`, status metadata, normalized `data`, and the raw transport `response` for production diagnostics.

Abort handling uses the standard `AbortController` API:

```ts
const controller = new AbortController();

const promise = endpoint.get('/users', {
  signal: controller.signal,
});

controller.abort();
```

## Serialization

Use request-level serializers when a project needs protocol-specific encoding:

```ts
await endpoint.post('/submit', payload, {
  bodySerializer: (data) => JSON.stringify(data),
  paramsSerializer: (params) => new URLSearchParams(params as Record<string, string>).toString(),
  responseDeserializer: (data) => data,
});
```

Serializers run before transport execution.

## Runtime File Helpers

Use runtime subpaths for file uploads and downloads so browser bundles do not include Node APIs and Node bundles do not include DOM helpers:

```ts
import { downloadFile, uploadFile } from 'endpoint-plus/browser';

await uploadFile(endpoint, '/upload', { name: 'file' });
await downloadFile(endpoint, '/reports/monthly.xlsx', 'monthly.xlsx');
```

```ts
import { downloadFile, uploadFile } from 'endpoint-plus/node';

await uploadFile(endpoint, '/upload', formData);
await downloadFile(endpoint, '/reports/monthly.xlsx', './downloads/monthly.xlsx');
```

The Node subpath writes with streams by default, so large downloads do not need to be buffered fully in memory when the active transport supports `responseType: 'stream'`.

```ts
import { downloadFile, uploadFile } from 'endpoint-plus/miniapp';

await uploadFile(endpoint, {
  filePath,
  name: 'file',
  runtime: wx,
  url: '/upload',
});

await downloadFile(endpoint, {
  runtime: wx,
  url: '/reports/monthly.xlsx',
});
```

Miniapp file helpers call `endpoint.prepareRequestConfig()` first, so request interceptors such as auth-token injection still apply. They do not run request middlewares because `wx.uploadFile` and `wx.downloadFile` are not normal request transports.

## Custom Transport Contract

Custom transports must implement:

```ts
interface EndpointTransport {
  request(config: InternalEndpointRequestConfig): Promise<EndpointTransportResponse>;
  setDefaults?(config: EndpointRequestConfig): void;
}
```

Custom transports should normalize their result into `EndpointTransportResponse` and preserve the final `config` used for execution. Transport-specific errors should include either `config` or `response.config` so `EndpointError` can preserve request context.

## Dependency Policy

The package uses `ofetch` for standards-based fetch transport behavior, `ufo` for URL/query composition, and `es-toolkit` for common utilities. Consumers still choose and install integrations such as `axios`, `node-fetch`, or the dev-only `quicktype-core` typegen engine in their own projects, then pass those implementations into the SDK through dedicated transports, plugins, or `createFetchTransport({ fetch })`.

## Production Checklist

Before publishing an internal stable version, run:

```sh
pnpm release:check
```

This validates formatting, linting, TypeScript, tests, and package builds across the workspace. For package-local checks during development, run:

```sh
pnpm --filter endpoint-plus format:check
pnpm --filter endpoint-plus lint
pnpm --filter endpoint-plus type-check
pnpm --filter endpoint-plus test
pnpm --filter endpoint-plus build
```

Package releases are managed through the repository release workflow:

```sh
pnpm changeset
pnpm version-packages
pnpm release
```

Public API types are covered by Vitest type assertions. Runtime behavior is covered for fetch, axios, miniapp transport, refresh token replay, retry, request cache, SSE buffering, and browser/node/miniapp file helpers.

---

## AI Assistant Skills

This package includes a `skills/` directory containing system prompts, documentation, references, and examples optimized for AI coding assistants (such as Antigravity, Cursor, Copilot, etc.).

By loading these skills, your AI assistant will instantly know how to correctly configure, use, and migrate to `endpoint-plus` in your project.

### Loading Skills in AI Coding Assistants

To make these skills available to your agent, copy the `skills` directory into your project's customizations directory:

1. Create a `.agents` directory in your consumer project root:
   ```bash
   mkdir -p .agents/skills
   ```
2. Copy the `endpoint-plus` skill folder from `node_modules`:
   ```bash
   cp -r node_modules/endpoint-plus/skills .agents/skills/endpoint-plus
   ```

The agent will automatically discover the skill and load its instructions when you ask questions or perform tasks related to `endpoint-plus`.
