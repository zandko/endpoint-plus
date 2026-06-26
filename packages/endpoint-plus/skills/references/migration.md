# Migration (Axios / Fetch)

## Table of Contents

- [Overview](#overview)
- [Instance Mapping](#instance-mapping)
- [Interceptor → Plugin Mapping](#interceptor--plugin-mapping)
- [Response Shape](#response-shape)
- [Cancellation](#cancellation)
- [Error Handling](#error-handling)
- [Upload / Download](#upload--download)
- [Incremental Migration](#incremental-migration)

## Overview

Migrating from axios or raw fetch to `@yw/endpoint-plus` is primarily about mapping existing patterns to the plugin system. The endpoint client does not use AxiosResponse wrappers — it returns response `data` by default.

## Instance Mapping

| Axios | Endpoint Plus |
|-------|--------------|
| `axios.create({ baseURL, timeout, headers })` | `createInstance({ baseURL, timeout, headers })` |
| `instance.defaults.headers.common['Auth']` | `createAuthTokenPlugin({ getToken, headerName })` |
| `instance.interceptors.request.use(...)` | `endpoint.use(createXxxPlugin(...))` or `endpoint.registerRequestInterceptor(...)` |
| `instance.interceptors.response.use(...)` | `endpoint.use(createEnvelopeAdapterPlugin(...))` or `endpoint.registerResponseInterceptor(...)` |

## Interceptor → Plugin Mapping

### Auth interceptor → auth-token plugin

```ts
// Before (axios)
axios.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});

// After (endpoint-plus)
import { createAuthTokenPlugin } from '@yw/endpoint-plus/plugins/auth-token';
endpoint.use(createAuthTokenPlugin({ getToken: () => tokenStore.accessToken }));
```

### Token refresh interceptor → refresh-token plugin

```ts
// After (endpoint-plus)
import { createRefreshTokenPlugin } from '@yw/endpoint-plus/plugins/refresh-token';
endpoint.use(createRefreshTokenPlugin<{ accessToken: string }>({
  refreshRequest: { method: 'POST', url: '/auth/refresh' },
  getAccessToken: () => tokenStore.accessToken,
  resolveAccessToken: (result) => result.accessToken,
  onRefresh: (result) => { tokenStore.setAccessToken(result.accessToken); },
}));
```

### Retry interceptor → retry plugin

```ts
import { createRetryPlugin } from '@yw/endpoint-plus/plugins/retry';
endpoint.use(createRetryPlugin({ retries: 2, delay: 300 }));
```

## Response Shape

| Pattern | Axios | Endpoint Plus (default) | Endpoint Plus (envelope) |
|---------|-------|------------------------|--------------------------|
| Return value | `AxiosResponse` | `data` directly | `data` directly (unwrapped) |
| Access raw response | `response` | `returnMode: 'response'` | `extensions.envelopeAdapter.mode = 'raw'` |
| Access envelope | `response.data` | N/A | `extensions.envelopeAdapter.mode = 'envelope'` |

```ts
// Before (axios)
const response = await axios.get('/users'); // AxiosResponse
const users = response.data;

// After (endpoint-plus)
const users = await endpoint.get('/users'); // data directly
```

## Cancellation

```ts
// Before (axios)
const source = axios.CancelToken.source();
axios.get('/users', { cancelToken: source.token });
source.cancel();

// After (endpoint-plus)
const controller = new AbortController();
endpoint.get('/users', { signal: controller.signal });
controller.abort();
```

## Error Handling

Endpoint errors are thrown as `EndpointError` with structured properties:

```ts
import { EndpointError } from '@yw/endpoint-plus';

try {
  await endpoint.get('/users');
} catch (error) {
  if (error instanceof EndpointError) {
    console.log(error.code);      // error code
    console.log(error.status);    // HTTP status
    console.log(error.response);  // transport response
    console.log(error.cause);     // original error
  }
}
```

This replaces checking `error.response` on AxiosError.

## Upload / Download

| Task | Axios | Endpoint Plus |
|------|-------|--------------|
| Upload form data | `axios.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })` | `endpoint.post(url, formData)` — content type auto-detected |
| Download file (browser) | `axios.get(url, { responseType: 'blob' })` | Use `@yw/endpoint-plus/browser` helpers |
| Download file (node) | `axios.get(url, { responseType: 'stream' })` | Use `@yw/endpoint-plus/node` helpers |

## Incremental Migration

When a project is too large to migrate at once:

1. Install `@yw/endpoint-plus` alongside axios.
2. Create a new endpoint instance with the same `baseURL` and auth logic.
3. Migrate one API module at a time — each module uses independent functions.
4. Keep the axios instance for unmigrated modules.
5. Remove axios after all modules are migrated.

```ts
// During migration: both coexist
import { endpoint } from '@/shared/endpoint';
import axios from '@/shared/axios';

// Migrated module
export function getUsers() {
  return endpoint.get('/users');
}

// Not yet migrated
export function getOrders() {
  return axios.get('/orders').then(r => r.data);
}
```
