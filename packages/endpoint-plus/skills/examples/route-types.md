# Example: Route Types

Use this when manually adding or reviewing `YwEndpoint.Routes` declarations.

## Manual Declaration

```ts
// src/types/endpoint-routes.d.ts
import type { User, CreateUserRequest } from '@/types/user';

declare module '@yw/endpoint-plus' {
  namespace YwEndpoint {
    interface Routes {
      'GET /users': { response: User[] };
      'GET /users/:userId': { response: User };
      'POST /users': { response: User; body: CreateUserRequest };
      'DELETE /users/:userId': { response: void };
    }
  }
}
```

## Matching Calls

```ts
import { endpoint } from '@/shared/endpoint';

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

## Prefix Rule

If the call contains `/api/v1`, the route key must contain it too:

```ts
endpoint.get('/api/v1/users');

declare module '@yw/endpoint-plus' {
  namespace YwEndpoint {
    interface Routes {
      'GET /api/v1/users': { response: User[] };
    }
  }
}
```

Preferred alternative:

```ts
createInstance({ baseURL: '/api/v1' });
endpoint.get('/users');
// route key: 'GET /users'
```

## Generated Types

DevTools generated declarations should live in a file included by TypeScript:

```text
src/types/endpoint-plus.generated.d.ts
```

Ensure `tsconfig.json` includes it, commonly via:

```json
{
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "src/**/*.d.ts"]
}
```
