# Type Standards

## Table of Contents

- [YwEndpoint.Routes Declaration](#ywendpointroutes-declaration)
- [Route Key Format](#route-key-format)
- [Route Key Must Match Call Path](#route-key-must-match-call-path)
- [Response Type Naming](#response-type-naming)
- [Field Type Rules](#field-type-rules)
- [Pagination Pattern](#pagination-pattern)
- [Route Design](#route-design)

## YwEndpoint.Routes Declaration

Business projects register route response types by augmenting `@yw/endpoint-plus`:

```ts
declare module '@yw/endpoint-plus' {
  namespace YwEndpoint {
    interface Routes {
      'GET /users': { response: User[] };
      'GET /users/:userId': { response: User };
      'POST /users': { response: User };
      'PUT /users/:userId': { response: User };
      'DELETE /users/:userId': { response: void };
    }
  }
}
```

Generated and manual route declarations can coexist — both merge into the same `interface Routes`.

## Route Key Format

```text
METHOD /path
```

| Element | Rule | Example |
|---------|------|---------|
| Method | Uppercase HTTP method | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| Path | kebab-case plural resources | `/user-orders` |
| Path params | camelCase with `:` prefix | `/users/:userId/orders/:orderId` |
| Query | Do not include in key | `/users`, not `/users?page=1` |
| Trailing slash | Omit | `/users`, not `/users/` |

## Route Key Must Match Call Path

The type system matches route keys against the actual `url` argument passed to endpoint methods. The route key must match what appears at the call site.

**If calls include `/api/v1`:**

```ts
endpoint.get('/api/v1/users');
// Route key must be: 'GET /api/v1/users'
// NOT: 'GET /users'
```

**To get shorter route keys**, move the prefix to `baseURL`:

```ts
createInstance({ baseURL: '/api/v1' });
endpoint.get('/users');
// Now route key is: 'GET /users'  ✅
```

Do not manually omit `/api` or `/v1` from route keys while calls still include them — this breaks type inference.

DevTools generates route keys that match the actual scanned path. If the scanner sees `/api/v1/users`, the generated key will be `'GET /api/v1/users'`.

## Response Type Naming

DevTools derives response type names as:

```text
{Method}{PascalCasePathSegments}Response
```

The type name strips `/api` and `/api/vN` prefixes. The route key does not.

| Call path | Route key | Type name |
|-----------|-----------|-----------|
| `/users` | `GET /users` | `GetUsersResponse` |
| `/users/:id` | `GET /users/:id` | `GetUsersByIDResponse` |
| `/api/v1/users/:userId/orders` | `GET /api/v1/users/:userId/orders` | `PostUsersByUserIDOrdersResponse` |

Manual type names are not forced to match, but prefer the same convention for readability.

## Field Type Rules

- Use primitive lowercase types: `string`, `number`, `boolean`.
- Use literal unions for enums: `'admin' | 'user'`.
- Use `string` for ISO datetime fields.
- Use optional properties for optional fields: `avatar?: string`.
- Avoid `any`; use `unknown` when the shape is intentionally unknown.
- Use `interface` for object shapes, not `type` aliases.

```ts
interface GetUsersResponse {
  id: number;
  name: string;
  email: string;
  createdAt: string; // ISO 8601
  role: 'admin' | 'user';
  avatar?: string;
}
```

## Pagination Pattern

```ts
interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface User {
  id: number;
  name: string;
}

declare module '@yw/endpoint-plus' {
  namespace YwEndpoint {
    interface Routes {
      'GET /users': { response: PaginatedResponse<User> };
    }
  }
}
```

## Route Design

Recommended:

```ts
'GET /users';
'GET /users/:userId';
'GET /users/:userId/orders';
'POST /orders/:orderId/cancel';
```

Avoid:

```ts
'GET /getUserList';     // verb in path
'POST /createUser';     // verb in path
'GET /user';            // singular resource
```
