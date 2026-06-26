# Request Config

## Table of Contents

- [Core Options](#core-options)
- [Params and Query](#params-and-query)
- [Serializers](#serializers)
- [Return Modes](#return-modes)
- [Response Type](#response-type)
- [AbortController](#abortcontroller)
- [Progress](#progress)
- [Per-Request Extensions](#per-request-extensions)

## Core Options

Endpoint requests accept core options such as:

- `baseURL`
- `url`
- `method`
- `headers`
- `params`
- `timeout`
- `signal`
- `responseType`
- `returnMode`

Use instance defaults for stable project-wide config, and per-request config for request-specific behavior.

```ts
export const endpoint = createInstance({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
  headers: { 'x-app': 'web' },
});

export function getUsers() {
  return endpoint.get('/users', { timeout: 5000 });
}
```

## Params and Query

```ts
export function searchUsers(keyword: string, page: number) {
  return endpoint.get('/users', {
    params: { keyword, page },
  });
}
```

Do not include query strings in `YwEndpoint.Routes` keys. Use route key `'GET /users'`, not `'GET /users?page=1'`.

## Serializers

Use request-level serializers when a backend needs protocol-specific encoding.

```ts
await endpoint.post('/submit', payload, {
  bodySerializer: (data) => JSON.stringify(data),
  paramsSerializer: (params) => new URLSearchParams(params as Record<string, string>).toString(),
  responseDeserializer: (data) => data,
});
```

Order:

1. Request config is prepared.
2. `bodySerializer` / `paramsSerializer` run before transport execution.
3. Transport executes.
4. `responseDeserializer` runs before envelope adaptation.
5. Envelope adapter may unwrap or normalize the response.

## Return Modes

Default request return is transport `data`.

Use request config when a caller needs more than `data`, for example raw transport response metadata.

```ts
const response = await endpoint.get('/users', {
  returnMode: 'response',
});
```

Use envelope adapter mode when the backend payload itself is an envelope:

```ts
const envelope = await endpoint.get('/users', {
  extensions: { envelopeAdapter: { mode: 'envelope' } },
});
```

## Response Type

Use `responseType` for binary/file responses and transport-specific handling.

```ts
const blob = await endpoint.get<Blob>('/report.xlsx', {
  responseType: 'blob',
});
```

For file helpers, prefer runtime-specific helpers in `@yw/endpoint-plus/browser`, `@yw/endpoint-plus/node`, or `@yw/endpoint-plus/miniapp` — see `runtime-helpers.md`.

## AbortController

Abort requests with the standard API.

```ts
const controller = new AbortController();

const promise = endpoint.get('/users', {
  signal: controller.signal,
});

controller.abort();
await promise;
```

Use this for route changes, component unmount, duplicate search cancellation, and user-triggered cancellation.

## Progress

The fetch transport does not fake upload progress because standard fetch does not expose upload progress reliably.

Use axios transport or a custom transport when accurate upload/download progress is required.

```ts
await endpoint.post('/upload', formData, {
  onUploadProgress: ({ loaded, total }) => {
    console.log(loaded, total);
  },
});
```

This requires axios transport and `axios` installed in the consuming project.

## Per-Request Extensions

Plugins can expose per-request options through `extensions`.

```ts
await endpoint.get('/profile', {
  extensions: {
    envelopeAdapter: { mode: 'envelope' },
    typegen: { name: 'GetProfileResponse' },
  },
});
```

Use per-request extensions when one call needs behavior different from shared endpoint defaults.
