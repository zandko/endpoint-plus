# Example: Axios Migration

Use this when replacing an existing axios instance with `@yw/endpoint-plus` while preserving auth and envelope behavior.

## Before

```ts
// src/shared/axios.ts
import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use((response) => {
  const { code, message, data } = response.data;
  if (code !== 0) throw new Error(message);
  return data;
});
```

```ts
// src/api/user.ts
import { http } from '@/shared/axios';

export function getUsers() {
  return http.get('/users');
}
```

## After

```ts
// src/shared/endpoint.ts
import { createFetchTransport, createInstance } from '@yw/endpoint-plus';
import { createAuthTokenPlugin } from '@yw/endpoint-plus/plugins/auth-token';

export const endpoint = createInstance({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
});

endpoint.setTransport(createFetchTransport());
endpoint.use(createAuthTokenPlugin({ getToken: () => localStorage.getItem('access_token') }));
```

```ts
// src/api/user.ts
import { endpoint } from '@/shared/endpoint';

export function getUsers() {
  return endpoint.get('/users');
}
```

## Notes

- Endpoint Plus returns `data` directly by default, not AxiosResponse.
- If axios-specific behavior is required, use `@yw/endpoint-plus/transports/axios` instead of fetch transport.
- Migrate module by module; axios and endpoint-plus can coexist during transition.
