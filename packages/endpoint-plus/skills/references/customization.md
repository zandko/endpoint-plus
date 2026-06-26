# Custom Plugins and Extensions

## Table of Contents

- [Choose Plugin or Extension](#choose-plugin-or-extension)
- [Custom Plugin Shape](#custom-plugin-shape)
- [Request Interceptor](#request-interceptor)
- [Request Middleware](#request-middleware)
- [Response Interceptor](#response-interceptor)
- [Custom Extension Shape](#custom-extension-shape)
- [TypeScript Tips](#typescript-tips)
- [Business Project Guidance](#business-project-guidance)

## Choose Plugin or Extension

| Need | Use | Why |
|------|-----|-----|
| Add request headers | Plugin | Request lifecycle concern |
| Normalize response envelope | Plugin | Response lifecycle concern |
| Retry/cache/dedupe/throttle | Plugin | Transport/request lifecycle concern |
| Observe logs/metrics/tracing | Plugin | Lifecycle telemetry |
| Add `endpoint.someMethod()` | Extension | Client capability/method concern |
| Compose multiple requests into a domain method | Extension | New method on client |

Both are installed with `.use()`, but they serve different purposes.

## Custom Plugin Shape

Plugins participate in the request lifecycle. They use `kind: 'plugin'` and a unique `id` symbol.

```ts
import { type EndpointPlugin } from '@yw/endpoint-plus';

export interface MyPluginOptions {
  headerValue: string;
}

const MY_PLUGIN_ID = Symbol('my-plugin');

export function createMyPlugin(options: MyPluginOptions): EndpointPlugin {
  return {
    id: MY_PLUGIN_ID,
    kind: 'plugin',
    setup(client) {
      client.registerRequestInterceptor((config) => {
        config.headers['X-Custom-Header'] = options.headerValue;
        return config;
      });
    },
  };
}
```

Use `Symbol()` for plugin IDs to avoid collisions.

## Request Interceptor

Use request interceptors to adjust request config before middleware and transport.

```ts
client.registerRequestInterceptor((config) => {
  config.headers['X-Tenant-ID'] = tenantStore.currentTenantId;
  return config;
});
```

Use cases:

- Add headers
- Add params
- Attach trace IDs
- Mark request context

Avoid heavy async side effects here unless necessary.

## Request Middleware

Use request middleware to wrap transport execution. Middleware follows an onion model and receives `next(config)`.

```ts
client.registerRequestMiddleware(async (config, next) => {
  const start = Date.now();
  try {
    const response = await next(config);
    console.log(`Request ${config.method} ${config.url} took ${Date.now() - start}ms`);
    return response;
  } catch (error) {
    console.error(`Request ${config.method} ${config.url} failed`, error);
    throw error;
  }
});
```

Use cases:

- Timing
- Retry-like wrappers
- Circuit breaker behavior
- Custom cache wrappers

Prefer built-in plugins when they already fit: retry, request-cache, request-gate, observability.

## Response Interceptor

Use response interceptors to inspect or transform transport responses after transport.

```ts
client.registerResponseInterceptor((response) => {
  if (response.status === 204) {
    return { ...response, data: undefined };
  }
  return response;
});
```

Use cases:

- Response normalization
- Status-specific transforms
- Response metrics

Prefer `createEnvelopeAdapterPlugin` for `{ code, message, data }` protocols.

## Custom Extension Shape

Extensions add methods to a client instance. They use `kind: 'extension'` and return an object from `setup()`.

```ts
import { type EndpointExtension } from '@yw/endpoint-plus';

export interface JobExtension {
  waitForJob(jobId: string): Promise<JobResult>;
}

const JOB_EXTENSION_ID = Symbol('job-extension');

export function createJobExtension(): EndpointExtension<JobExtension> {
  return {
    id: JOB_EXTENSION_ID,
    kind: 'extension',
    setup(client) {
      return {
        async waitForJob(jobId: string) {
          let attempt = 0;
          while (attempt < 20) {
            const result = await client.get<JobResult>(`/jobs/${jobId}`);
            if (result.done) return result;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            attempt += 1;
          }
          throw new Error(`Job ${jobId} did not finish in time`);
        },
      };
    },
  };
}
```

Usage:

```ts
const endpointWithJobs = endpoint.use(createJobExtension());
await endpointWithJobs.waitForJob('job-1');
```

## TypeScript Tips

- Export an interface for extension methods.
- Return `EndpointExtension<MyExtension>` from the factory.
- Assign `.use()` result to preserve added methods.
- Keep plugin options and extension method input types explicit.
- Avoid `any`; use `unknown` for intentionally unknown data.

```ts
const endpointWithFeature = endpoint.use(createMyExtension());
endpointWithFeature.myMethod();
```

## Business Project Guidance

Create custom plugins/extensions in the consuming project only when the behavior is genuinely reusable across multiple API modules.

Recommended locations:

```text
src/shared/endpoint.ts                  # installs plugins/extensions
src/shared/endpoint-plugins/*.ts        # custom lifecycle plugins
src/shared/endpoint-extensions/*.ts     # custom client methods
```

Do not fork or modify `@yw/endpoint-plus` package source for business-specific behavior. Prefer local plugins/extensions in the business project.
