# Transports

## Table of Contents

- [Transport Boundary](#transport-boundary)
- [Fetch Transport](#fetch-transport)
- [Axios Transport](#axios-transport)
- [Miniapp Transport](#miniapp-transport)
- [Custom Transport](#custom-transport)
- [Choosing a Transport](#choosing-a-transport)

## Transport Boundary

A transport executes the prepared request and returns a normalized transport response. The endpoint client handles defaults, interceptors, plugins, and extensions around that transport.

Use public transport entries:

```ts
import { createFetchTransport } from '@yw/endpoint-plus';
import { createAxiosTransport } from '@yw/endpoint-plus/transports/axios';
import { createMiniappTransport } from '@yw/endpoint-plus/transports/miniapp';
```

Do not import internal runtime/shared files from the package.

## Fetch Transport

Use fetch for browser, Node.js 22+, and SSR runtimes with standards-compatible fetch.

```ts
import { createFetchTransport } from '@yw/endpoint-plus';

endpoint.setTransport(createFetchTransport());
```

Pass explicit fetch for framework runtimes or polyfills:

```ts
endpoint.setTransport(createFetchTransport({ fetch: event.fetch }));
```

Fetch transport is the best default for modern frontend projects. It does not reliably expose upload progress.

## Axios Transport

Use axios only when the project needs axios-specific behavior:

- existing axios interceptors during incremental migration
- upload/download progress events
- axios-specific adapters
- legacy backend behavior already encoded in axios config

```ts
import { createAxiosTransport } from '@yw/endpoint-plus/transports/axios';

endpoint.setTransport(createAxiosTransport());
```

Install axios in the consuming project:

```sh
pnpm add axios
```

Native axios progress handlers can pass through request config:

```ts
await endpoint.post('/upload', formData, {
  onUploadProgress: ({ loaded, total }) => {
    console.log(loaded, total);
  },
});
```

## Miniapp Transport

Use the pure miniapp transport subpath for clear transport boundaries:

```ts
import { createMiniappTransport } from '@yw/endpoint-plus/transports/miniapp';

endpoint.setTransport(createMiniappTransport({ runtime: wx }));
```

For uni-app:

```ts
endpoint.setTransport(createMiniappTransport({ runtime: uni }));
```

The runtime must provide a `request(options)` API compatible with `wx.request` or `uni.request`.

Use `@yw/endpoint-plus/miniapp` for miniapp runtime file helpers (`uploadFile`, `downloadFile`) rather than transport-only setup.

## Custom Transport

Create a custom transport when the business project must integrate a non-standard request client or platform runtime.

Contract:

```ts
interface EndpointTransport {
  request(config: InternalEndpointRequestConfig): Promise<EndpointTransportResponse>;
  setDefaults?(config: EndpointRequestConfig): void;
}
```

Guidelines:

- Normalize success responses into `EndpointTransportResponse`.
- Preserve the final request config on the response.
- For transport-specific errors, include either `config` or `response.config` so `EndpointError` can preserve request context.
- Keep auth/retry/cache/envelope behavior in plugins where possible, not inside the transport.

Skeleton:

```ts
export function createInternalTransport(): EndpointTransport {
  return {
    setDefaults(config) {
      // optional: pass defaults into the underlying request client
    },
    async request(config) {
      const response = await internalRequestClient.request({
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data,
      });

      return {
        config,
        data: response.data,
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      };
    },
  };
}
```

## Choosing a Transport

| Situation | Recommended transport |
|-----------|-----------------------|
| Modern browser/Vite app | fetch |
| SSR with framework fetch | fetch with explicit `fetch` |
| Node.js 22+ service | fetch |
| Need upload progress | axios or custom transport |
| Existing axios migration | axios first, then optionally fetch later |
| WeChat/uni-app miniapp | miniapp transport |
| Internal request runtime | custom transport |
