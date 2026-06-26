# DevTools

## Table of Contents

- [Purpose](#purpose)
- [Install](#install)
- [Vite Plugin Setup](#vite-plugin-setup)
- [Scanner Behavior](#scanner-behavior)
- [Generated Types Flow](#generated-types-flow)
- [Sample-Based Type Generation](#sample-based-type-generation)
- [Route Manifest](#route-manifest)
- [Verification](#verification)
- [Configuration Variants](#configuration-variants)
- [Do Not](#do-not)

## Purpose

`@yw/endpoint-plus-devtools` is for Vite development. It provides:

- Route catalog — discovered endpoint calls in business code
- Response capture — runtime response samples for each route
- Type preview — TypeScript declarations from response samples
- Type save — write declarations into a `.d.ts` file that augments `YwEndpoint.Routes`

## Install

```sh
pnpm add -D @yw/endpoint-plus-devtools quicktype-core
```

`quicktype-core` is optional but recommended. Without it, type generation falls back to less precise inference.

## Vite Plugin Setup

```ts
// vite.config.ts
import endpointPlusDevtools from '@yw/endpoint-plus-devtools/vite';

export default defineConfig({
  plugins: [
    endpointPlusDevtools({
      typegen: { outputFile: 'src/types/endpoint-plus.generated.d.ts' },
    }),
  ],
});
```

Defaults:

| Option | Default |
|--------|---------|
| `enabled` | `process.env.NODE_ENV !== 'production'` |
| `base` | `/__endpoint-plus-devtools/` |
| `typegen.outputFile` | `src/types/endpoint-plus.generated.d.ts` |

The plugin applies to `serve` mode only by default. The output file must be project-root-relative.

## Scanner Behavior

The Vite plugin scans:

```text
src/**/*.{ts,tsx,js,jsx,vue}
```

It ignores `node_modules`, `dist`, `.git`, `.nuxt`, `.output`.

### Scannable call shapes

```ts
endpoint.get('/users');
endpoint.delete('/users/1');
endpoint.post('/users', data);
endpoint.put('/users/1', data);
endpoint.patch('/users/1/status', data);
endpoint.request({ method: 'GET', url: '/users' });
```

### Scannable URL expressions

```ts
endpoint.get('/users');                    // literal
endpoint.get(`/users/${userId}`);          // template → /users/:userId
```

### Not reliably scannable

```ts
const url = buildPath(userId);
endpoint.get(url);                         // dynamic variable

const config = { method: 'GET', url: '/users' };
endpoint.request(config);                  // indirect config
```

Keep route strings as literals or template literals at the call site for DevTools to discover them.

## Generated Types Flow

1. DevTools scans endpoint calls → route manifest entries appear in the catalog.
2. At runtime, responses are captured for scanned routes.
3. DevTools previews TypeScript declarations from response samples using `quicktype-core`.
4. User previews and saves → declarations are written to `typegen.outputFile`.
5. The generated file augments `YwEndpoint.Routes` so `endpoint.get('/path')` infers the response type.

## Sample-Based Type Generation

Type generation is **sample-based**, not schema-based. Important implications:

- A response must actually be triggered before DevTools can generate its type.
- Empty arrays produce `unknown[]` — ask the user to trigger responses with non-empty data.
- Optional or missing fields may not be detected from a single sample.
- The generated type reflects one observed response, not the full API contract.

Advise the user to trigger representative responses that include optional fields and non-empty lists.

## Route Manifest

For a call such as:

```ts
endpoint.get(`/users/${userId}`);
```

The scanner records:

- method: `GET`
- template: `/users/:userId`
- response type name: `GetUsersByUserIDResponse`

Type name generation strips leading `/api` or `/api/vN` from the type name. The route key in the generated declaration will match the actual path — see [type-standards.md](type-standards.md) for route key rules.

## Verification

After setup:

1. Start the Vite dev server.
2. Open the app in a browser.
3. Trigger at least one endpoint request.
4. Open the DevTools panel.
5. Confirm the route appears in the catalog.
6. Preview and save the generated type.
7. Confirm the generated `.d.ts` file is included by `tsconfig.json`.
8. Hover or type-check `endpoint.get('/path')` to confirm response inference.

For tsconfig, ensure the generated file is covered by `include` patterns (e.g. `src/**/*.d.ts`). If the project uses `types` field restrictions, adjust accordingly.

## Configuration Variants

Custom output file:

```ts
endpointPlusDevtools({ typegen: { outputFile: 'src/contracts/routes.d.ts' } });
```

Disable:

```ts
endpointPlusDevtools({ enabled: false });
```

Custom panel base path:

```ts
endpointPlusDevtools({ base: '/internal/devtools/' });
```

## Do Not

- Enable DevTools in production builds.
- Write generated type files outside the project root.
- Expect arbitrary dynamic route builders to be scanned.
- Expect generated types to represent the full API contract — they reflect observed samples only.
