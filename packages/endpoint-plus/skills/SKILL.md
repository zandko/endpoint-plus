---
name: endpoint-plus
description: |
  Use when a business project uses @yw/endpoint-plus or @yw/endpoint-plus-devtools: setup, endpoint instance config, transports, plugins, Vite devtools, route scanning, generated response types, YwEndpoint.Routes, type inference failures, axios/fetch migration, 接入 endpoint-plus, devtools 扫描接口, 生成接口类型.
---

# Endpoint Plus 🧪

> Help business projects adopt `@yw/endpoint-plus` and `@yw/endpoint-plus-devtools`.

## Scope

This skill targets **library users**, not library maintainers. Do not recommend edits inside `@yw/endpoint-plus` or `@yw/endpoint-plus-devtools` package source.

## Request Routing

| User wants… | Read this first |
|---|---|
| New setup / install / instance creation | `${CURRENT_SKILL_PATH}/references/setup.md` |
| Request options / serializers / abort / progress / return mode | `${CURRENT_SKILL_PATH}/references/request-config.md` |
| Transport choice / fetch / axios / miniapp / custom transport | `${CURRENT_SKILL_PATH}/references/transports.md` |
| Runtime file upload/download helpers | `${CURRENT_SKILL_PATH}/references/runtime-helpers.md` |
| Error handling / `EndpointError` / production logging | `${CURRENT_SKILL_PATH}/references/errors.md` |
| Plugin config (auth, envelope, retry, cache, gate, observability, typegen) | `${CURRENT_SKILL_PATH}/references/plugins.md` |
| Extension methods (polling, long polling, SSE, workflow) | `${CURRENT_SKILL_PATH}/references/extensions.md` |
| Custom plugin or custom extension authoring | `${CURRENT_SKILL_PATH}/references/customization.md` |
| DevTools / route scanning / type generation | `${CURRENT_SKILL_PATH}/references/devtools.md` |
| Route keys / `YwEndpoint.Routes` / response interfaces | `${CURRENT_SKILL_PATH}/references/type-standards.md` |
| Axios or fetch migration | `${CURRENT_SKILL_PATH}/references/migration.md` |
| Type inference failure / scan missing / SSR leak / envelope confusion | `${CURRENT_SKILL_PATH}/references/troubleshooting.md` |

Multiple files are fine — e.g. a migration task likely needs migration + plugins + troubleshooting references; an SSE task likely needs extensions + setup references.

## Core Rules

1. **Inspect before editing.** Read `package.json`, lockfile, `vite.config.*`, existing API wrappers, and token/auth patterns first. For complex setup or troubleshooting, run `${CURRENT_SKILL_PATH}/scripts/inspect-endpoint-project.cjs <project-root>`.
2. **Preserve existing conventions.** Adapt suggestions to the project's style; do not force a new structure.
3. **Route key must match call path.** If `endpoint.get('/api/v1/users')`, the route key is `'GET /api/v1/users'`, not `'GET /users'`. Move `/api/v1` to `baseURL` if shorter keys are desired.
4. **DevTools is dev-only.** Do not enable it in production builds.
5. **Prefer independent API functions.** One exported function per endpoint call, not object aggregations.
6. **Validate changes.** Run the project's type-check, build, and tests after editing.

## Preflight

Before editing a business project, determine:

- Package manager: check lockfile (`pnpm-lock.yaml` / `yarn.lock` / `package-lock.json` / `bun.lockb`)
- Runtime: browser SPA / SSR (Nuxt, Next) / Node / miniapp
- Existing HTTP client: axios / fetch / ofetch / other
- Auth storage: localStorage / cookie / server session / pinia store
- Response envelope: raw transport data / `{ code, message, data }` / other
- Vite: yes/no
- TypeScript: yes/no, `tsconfig.json` include patterns

## Additional Resources

### References

- `${CURRENT_SKILL_PATH}/references/setup.md` — install, endpoint instance, basic setup, SSR setup.
- `${CURRENT_SKILL_PATH}/references/request-config.md` — request options, serializers, return modes, response types, abort, progress, per-request extensions.
- `${CURRENT_SKILL_PATH}/references/transports.md` — fetch, axios, miniapp, custom transport choice and contracts.
- `${CURRENT_SKILL_PATH}/references/runtime-helpers.md` — browser/node/miniapp upload and download helpers.
- `${CURRENT_SKILL_PATH}/references/errors.md` — `EndpointError`, transport/HTTP/envelope/abort/refresh/retry error handling.
- `${CURRENT_SKILL_PATH}/references/plugins.md` — auth token, refresh token, envelope adapter, retry, cache, gate, observability, typegen.
- `${CURRENT_SKILL_PATH}/references/extensions.md` — polling, long polling, SSE, event buffering, workflow helpers, extension runtime compatibility.
- `${CURRENT_SKILL_PATH}/references/customization.md` — custom plugin and custom extension authoring patterns.
- `${CURRENT_SKILL_PATH}/references/devtools.md` — Vite plugin setup, scanner behavior, response capture, sample-based type generation, verification.
- `${CURRENT_SKILL_PATH}/references/type-standards.md` — `YwEndpoint.Routes`, route key matching, response naming, field rules.
- `${CURRENT_SKILL_PATH}/references/migration.md` — axios/fetch migration strategy and mapping.
- `${CURRENT_SKILL_PATH}/references/troubleshooting.md` — inference, scanning, generated types, token, envelope, SSR, extension issues.

### Examples

Read examples when the user asks for concrete implementation patterns:

- `${CURRENT_SKILL_PATH}/examples/vite-basic.md` — minimal Vite setup.
- `${CURRENT_SKILL_PATH}/examples/vite-devtools.md` — Vite + DevTools + generated route types.
- `${CURRENT_SKILL_PATH}/examples/axios-migration.md` — axios instance migration.
- `${CURRENT_SKILL_PATH}/examples/ssr-safe.md` — request-scoped SSR setup.
- `${CURRENT_SKILL_PATH}/examples/route-types.md` — manual and generated route typing patterns.
- `${CURRENT_SKILL_PATH}/examples/file-transfer.md` — browser/node/miniapp upload and download examples.
- `${CURRENT_SKILL_PATH}/examples/custom-plugin-extension.md` — local custom plugin and extension examples.

### Scripts

- `${CURRENT_SKILL_PATH}/scripts/inspect-endpoint-project.cjs <project-root>` — inspect package manager, dependencies, Vite config, axios usage, endpoint calls, generated types, and route-prefix risks.

## API Function Pattern

Prefer independent functions, not object aggregations:

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

## Do Not

- Edit `node_modules` or `@yw/endpoint-plus` package source to fix usage problems
- Generate route declarations whose keys do not match actual endpoint call paths
- Enable DevTools in production
- Store SSR user token or cache in module-level singletons
- Overwrite existing API abstractions without mapping current behavior first
- Use `any` in route response types; use `unknown` when the shape is uncertain

## Version Note

This skill is based on `@yw/endpoint-plus` v2 and current `@yw/endpoint-plus-devtools` source. If the business project has a different version, inspect `node_modules/@yw/endpoint-plus/package.json` exports and types before applying examples.
