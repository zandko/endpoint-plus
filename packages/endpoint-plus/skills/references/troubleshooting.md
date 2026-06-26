# Troubleshooting

## Table of Contents

- [Type Inference Does Not Work](#type-inference-does-not-work)
- [Route Key Mismatch](#route-key-mismatch)
- [DevTools Does Not Scan a Route](#devtools-does-not-scan-a-route)
- [Generated File Not Updated or Causes Reloads](#generated-file-not-updated-or-causes-reloads)
- [quicktype-core Missing](#quicktype-core-missing)
- [Generated Types Are Incomplete or Wrong](#generated-types-are-incomplete-or-wrong)
- [Envelope Shape Confusion](#envelope-shape-confusion)
- [Token Missing from Requests](#token-missing-from-requests)
- [SSR Token or Cache Leakage](#ssr-token-or-cache-leakage)
- [Extension Methods Missing in TypeScript](#extension-methods-missing-in-typescript)
- [Validation Commands](#validation-commands)

## Type Inference Does Not Work

Checklist — go through in order:

1. Confirm the `.d.ts` file is included by `tsconfig.json` (`include` covers `src/**/*.d.ts`).
2. Confirm the declaration augments exactly `declare module '@yw/endpoint-plus'`.
3. Confirm the route key matches the actual call path — see [type-standards.md](type-standards.md).
4. Confirm the method is uppercase: `GET`, not `get`.
5. Confirm query strings are not part of the route key.
6. Confirm path params use `:paramName` style matching declarations.
7. Restart the TS server — newly created `.d.ts` files may need a server restart.

Example manual declaration:

```ts
declare module '@yw/endpoint-plus' {
  namespace YwEndpoint {
    interface Routes {
      'GET /users/:userId': { response: User };
    }
  }
}
```

## Route Key Mismatch

The most common cause of type inference failure.

```ts
// Call: endpoint.get('/api/v1/users/1')
// Route key in declaration: 'GET /users/:userId'
// → MISMATCH. Type will not infer.
```

Fix — move prefix to `baseURL`:

```ts
createInstance({ baseURL: '/api/v1' });
endpoint.get('/users/1');
// Route key 'GET /users/:userId' now matches.
```

Or align the declaration with the actual call path:

```ts
'GET /api/v1/users/:userId': { response: User };
```

See [type-standards.md](type-standards.md) for the full route key rules.

## DevTools Does Not Scan a Route

Is the call inside `src/**/*.{ts,tsx,js,jsx,vue}`?

Scannable:

```ts
endpoint.get('/users');
endpoint.get(`/users/${userId}`);
endpoint.request({ method: 'GET', url: '/users' });
```

Often not scannable:

```ts
const url = buildPath(userId);
endpoint.get(url);

const config = { method: 'GET', url: '/users' };
endpoint.request(config);
```

Refactor to keep method and URL literal/template at the call site.

## Generated File Not Updated or Causes Reloads

The Vite plugin un-watches the generated `.d.ts` file to avoid HMR loops.

If the file is not updated:

1. Check `typegen.outputFile` is project-root-relative.
2. Check the directory exists or can be created.
3. Check dev server console for `[endpoint-plus:typegen]` errors.
4. Check editor/filesystem permissions.

## quicktype-core Missing

```sh
pnpm add -D quicktype-core
```

Without it, type generation falls back to less precise inference. Do not install it as a runtime dependency.

## Generated Types Are Incomplete or Wrong

Type generation is sample-based:

- Empty arrays → `unknown[]`. Trigger a response with non-empty data.
- Missing optional fields → not detected. Trigger responses that include them.
- Union types → may collapse to one variant. This is a quicktype limitation.
- Generated types represent observed samples, not the full API contract.

For critical APIs, supplement generated types with manual declarations that reflect the full contract.

## Envelope Shape Confusion

| Mode | Return value |
|------|-------------|
| No envelope adapter | transport `data` (raw response body) |
| Envelope adapter, default | unwrapped `data` from `{ code, message, data }` |
| `extensions.envelopeAdapter.mode = 'envelope'` | `{ code, success, message, data }` |
| `extensions.envelopeAdapter.mode = 'raw'` | original backend payload |

When a caller expects `code/message/data` but receives only `data`, set per-request envelope mode or adjust the shared API wrapper.

## Token Missing from Requests

1. `createAuthTokenPlugin` is installed on the **same endpoint instance** used by API functions.
2. `getToken` reads from the correct storage for the current runtime.
3. SSR code does not use `localStorage`.
4. Per-request headers do not overwrite the auth header.
5. Refresh-token replay updates the access token before retrying.

## SSR Token or Cache Leakage

Bad — module-level singleton with request-scoped token:

```ts
export const endpoint = createInstance({ baseURL: process.env.API_BASE_URL });
endpoint.use(createAuthTokenPlugin({ getToken: () => currentRequestToken }));
```

Good — factory function, one instance per request:

```ts
export function createServerEndpoint(event: { fetch: typeof fetch; token?: string }) {
  const endpoint = createInstance({ baseURL: process.env.API_BASE_URL });
  endpoint.setTransport(createFetchTransport({ fetch: event.fetch }));
  endpoint.use(createAuthTokenPlugin({ getToken: () => event.token ?? null }));
  return endpoint;
}
```

Use request-scoped cache stores when cache data depends on user identity.

## Extension Methods Missing in TypeScript

Assign `.use()` return values to preserve TypeScript methods:

```ts
const endpointWithPolling = endpoint.use(createPollingExtension());
await endpointWithPolling.poll('/jobs/1');
```

Calling `.use()` without assignment installs runtime methods, but the original variable retains its previous type.

## Validation Commands

Use the business project's scripts:

```sh
pnpm type-check   # or: tsc --noEmit
pnpm build
pnpm test
```

For Vite DevTools setup, also start the dev server and verify endpoint calls appear in the DevTools panel.
