# Endpoint-Plus Type Definition Standards

Standardizing route naming and type definition styles when using `endpoint-plus`.

---

## 1. Route Key Format

Keys in `YwEndpoint.Routes` must follow the **`METHOD /path`** format:

```ts
declare module 'endpoint-plus' {
  namespace YwEndpoint {
    interface Routes {
      'GET /users': { response: User[] };
      'GET /users/:id': { response: User };
      'POST /users': { response: User };
      'PUT /users/:id': { response: User };
      'PATCH /users/:id/status': { response: User };
      'DELETE /users/:id': { response: void };
    }
  }
}
```

### Naming Conventions

| Element | Rule | Example |
| --- | --- | --- |
| Method | UPPERCASE | `GET` `POST` `PUT` `PATCH` `DELETE` |
| Path | kebab-case plural nouns | `/user-orders` instead of `/userOrder` or `/user_orders` |
| Route Param | `:paramName` camelCase | `/users/:userId/orders/:orderId` |
| Query | Do not include in key | Query params do not affect route matching |
| Trailing Slash | Do not include | `/users` instead of `/users/` |
| API Prefix | Omit (scanner automatically skips `/api`, `/v1`, etc.) | Code uses `/api/v1/users`, type key uses `GET /users` |

---

## 2. Response Type Naming

### Auto-generation Rule

The devtools scanner derives response type names from route keys:

```
{Method}{PascalCasePathSegments}Response
```

| Route | Derived Type Name |
| --- | --- |
| `GET /users` | `GetUsersResponse` |
| `GET /users/:id` | `GetUsersByIDResponse` |
| `POST /users/:userId/orders` | `PostUsersByUserIDOrdersResponse` |
| `PUT /users/:id/profile` | `PutUsersByIDProfileResponse` |

### Manually Registered Types

You can define any type name directly in `Routes`. While matching the auto-generated names is **not strictly required**, it is recommended:

```ts
'GET /users': { response: GetUsersResponse };
'GET /users/:id': { response: GetUsersByIDResponse };
```

### Target Types Must Be Interfaces

Types produced by generator tools (devtools + quicktype or manual definitions) must use `interface` instead of `type`:

```ts
// ✅ Recommended
interface GetUsersResponse { ... }

// ❌ Avoid
type GetUsersResponse = { ... };
```

---

## 3. Registering Types

### Method A: Devtools Auto-generation (Recommended)

When using the `endpoint-plus-devtools` Vite plugin, the scanner automatically extracts endpoint routes from source code and compiles them into a TypeScript declarations file.

To generate actual TypeScript schemas from JSON samples, install `quicktype-core` in your project:

```sh
pnpm add -D quicktype-core
```

The generated file automatically wraps declarations in a `declare module "endpoint-plus" { ... }` block.

### Method B: Manual Registration

Create a `.d.ts` or `.ts` file and register routes manually:

```ts
// src/types/endpoint-routes.ts
declare module 'endpoint-plus' {
  namespace YwEndpoint {
    interface Routes {
      'GET /users': { response: GetUsersResponse };
      'GET /users/:id': { response: GetUsersByIDResponse };
    }
  }
}
```

> Note: Manual registration and devtools auto-generation can co-exist. Routes scanned by devtools will be appended to the same `Routes` interface.

---

## 4. Best Practices

### 4.1 Route Path Design

```ts
// ✅ Recommended: Clear hierarchy, plural resource names
'GET /users';
'GET /users/:userId';
'GET /users/:userId/orders';
'GET /users/:userId/orders/:orderId';

// ❌ Avoid: Verbs in URL path
'GET /getUserList';
'POST /createUser';

// ❌ Avoid: Singular resource names
'GET /user';
```

### 4.2 Route Parameter Naming

Use camelCase parameter names that represent their business context:

```ts
// ✅ Recommended
':userId'; // instead of ':id'
':orderId'; // instead of ':oid'
':teamId'; // instead of ':tid'

// ✅ Generic ID (Acceptable when context is clear or generic)
':id';
```

### 4.3 Response Interface Definitions

```ts
interface GetUsersResponse {
  id: number;
  name: string;
  email: string;
  createdAt: string; // ISO 8601
  role: 'admin' | 'user';
}
```

- Use lowercase primitive names (`number`, `string`, `boolean`, etc.)
- Use literal union types for finite state enums.
- Use `string` (ISO 8601 format) for date/time representations.
- Use optional operator `?` for nullable/omitted properties.

### 4.4 Standard Pagination Layout

```ts
interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface GetUsersResponse {
  id: number;
  name: string;
}
// Registered as:
'GET /users': { response: PaginatedResponse<GetUsersResponse> };
```

### 4.5 Business Semantic Naming

Reflect operations in business terms rather than implementation details:

```ts
// ✅ Recommended
'POST /orders/:orderId/cancel';

// ❌ Avoid
'POST /orders/:id/status/update';
```

---

## 5. Quicktype-Core Dependency

- `quicktype-core` is an **optional peer dependency**.
- It is only required to infer full TypeScript interfaces from JSON response data.
- If not installed, devtools will gracefully fall back to generic comments or placeholders.
- Install it once in your monorepo root:

```sh
pnpm add -D quicktype-core
```

---

## 6. Complete Example

```ts
// src/types/endpoint-routes.ts

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string; // ISO 8601
}

interface CreateUserRequest {
  name: string;
  email: string;
  avatar?: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
  avatar?: string;
}

declare module 'endpoint-plus' {
  namespace YwEndpoint {
    interface Routes {
      'GET /users': { response: User[] };
      'GET /users/:userId': { response: User };
      'POST /users': { response: User };
      'PUT /users/:userId': { response: User };
      'PATCH /users/:userId': { response: User };
      'DELETE /users/:userId': { response: void };
      'POST /users/:userId/orders': { response: Order };
      'GET /users/:userId/orders': { response: Order[] };
    }
  }
}
```

Using routes with full compile-time type-safety:

```ts
const users = await endpoint.get('/users');
//    ^? User[]

const user = await endpoint.get('/users/1');
//    ^? User

const created = await endpoint.post('/users', { name: 'Ada', email: 'ada@example.com' });
//    ^? User
```
