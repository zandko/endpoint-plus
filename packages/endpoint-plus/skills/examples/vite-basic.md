# Example: Minimal Vite Setup

Use this when a Vite business project needs basic `@yw/endpoint-plus` setup without DevTools.

## Install

```sh
pnpm add @yw/endpoint-plus
```

Use the project's actual package manager.

## Endpoint Instance

```ts
// src/shared/endpoint.ts
import { createFetchTransport, createInstance } from '@yw/endpoint-plus';
import { createAuthTokenPlugin } from '@yw/endpoint-plus/plugins/auth-token';

export const endpoint = createInstance({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
});

endpoint.setTransport(createFetchTransport());

endpoint.use(createAuthTokenPlugin({
  getToken: () => localStorage.getItem('access_token'),
}));
```

This example is browser-only because it uses `localStorage`. For SSR, use `examples/ssr-safe.md`.

## Independent API Functions

```ts
// src/api/user.ts
import { endpoint } from '@/shared/endpoint';

export interface CreateUserRequest {
  name: string;
  email: string;
}

export function getUsers() {
  return endpoint.get('/users');
}

export function getUser(userId: string) {
  return endpoint.get(`/users/${userId}`);
}

export function createUser(input: CreateUserRequest) {
  return endpoint.post('/users', input);
}
```

Prefer independent exported functions over object aggregation.
