# Example: Vite + Endpoint Plus DevTools

Use this when a Vite business project needs route scanning and generated `YwEndpoint.Routes` types.

## Install

```sh
pnpm add @yw/endpoint-plus
pnpm add -D @yw/endpoint-plus-devtools quicktype-core
```

## Vite Config

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import endpointPlusDevtools from '@yw/endpoint-plus-devtools/vite';

export default defineConfig({
  plugins: [
    vue(),
    endpointPlusDevtools({
      typegen: {
        outputFile: 'src/types/endpoint-plus.generated.d.ts',
      },
    }),
  ],
});
```

## Scannable Calls

```ts
// src/api/user.ts
import { endpoint } from '@/shared/endpoint';

export function getUsers() {
  return endpoint.get('/users');
}

export function getUser(userId: string) {
  return endpoint.get(`/users/${userId}`);
}

export function updateUser(userId: string, input: UpdateUserRequest) {
  return endpoint.put(`/users/${userId}`, input);
}
```

Avoid hiding route strings behind arbitrary builders when DevTools scanning is expected.

## Verification

1. Start the Vite dev server.
2. Open the app.
3. Trigger endpoint requests.
4. Open Endpoint Plus DevTools.
5. Confirm routes appear.
6. Preview and save generated types.
7. Confirm `src/types/endpoint-plus.generated.d.ts` is included by TypeScript.
8. Run type-check.

## Sample-Based Warning

Generated types are based on observed response samples. Trigger representative responses, especially non-empty lists and optional-field cases.
