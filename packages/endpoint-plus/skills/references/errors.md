# Errors

## Table of Contents

- [EndpointError](#endpointerror)
- [Transport Failures](#transport-failures)
- [HTTP Status Errors](#http-status-errors)
- [Envelope Business Errors](#envelope-business-errors)
- [Abort Errors](#abort-errors)
- [Refresh Token Failures](#refresh-token-failures)
- [Retry Final Failure](#retry-final-failure)
- [Production Logging](#production-logging)

## EndpointError

All transport failures are normalized to `EndpointError`.

```ts
import { EndpointError } from '@yw/endpoint-plus';

try {
  await endpoint.get('/secure');
} catch (error) {
  if (error instanceof EndpointError) {
    console.log(error.status);
    console.log(error.headers);
    console.log(error.data);
    console.log(error.config);
    console.log(error.response);
    console.log(error.cause);
  }
}
```

`EndpointError` preserves:

| Property | Meaning |
|----------|---------|
| `status` | HTTP or transport status when available |
| `headers` | Response headers when available |
| `data` | Normalized response data/error payload |
| `config` | Request config used for execution |
| `response` | Raw normalized transport response when available |
| `cause` | Original error |

## Transport Failures

Network errors, platform runtime failures, miniapp request failures, and thrown transport errors should become `EndpointError`.

When writing a custom transport, preserve `config` or `response.config` so diagnostics know which request failed.

## HTTP Status Errors

Handle HTTP errors by checking `EndpointError.status`.

```ts
catch (error) {
  if (error instanceof EndpointError && error.status === 401) {
    redirectToLogin();
  }
}
```

Prefer central handling through plugins/interceptors for repeated rules, and local handling for request-specific UX.

## Envelope Business Errors

With `createEnvelopeAdapterPlugin()`, backend envelope failures such as non-success `code` can throw before business code receives data.

Use envelope mode when the caller needs the normalized envelope for custom handling:

```ts
const result = await endpoint.get('/profile', {
  extensions: { envelopeAdapter: { mode: 'envelope' } },
});

if (!result.success) {
  showError(result.message);
}
```

Use raw mode when the project needs original backend payload:

```ts
const raw = await endpoint.get('/profile', {
  extensions: { envelopeAdapter: { mode: 'raw' } },
});
```

## Abort Errors

Abort with `AbortController`:

```ts
const controller = new AbortController();
const promise = endpoint.get('/users', { signal: controller.signal });
controller.abort();
```

Treat abort as a controlled cancellation in UI code. Avoid showing generic error toast for user-initiated aborts.

## Refresh Token Failures

Refresh token plugin can fail when:

- refresh endpoint rejects
- refresh response has no access token
- refresh request itself returns 401/403
- replayed original request fails again

Recommendations:

- `shouldRefresh` should return `false` for refresh-endpoint errors to avoid loops.
- `resolveAccessToken` should return `null` when no valid token exists.
- `onRefresh` should persist the new token atomically.
- Clear auth state and redirect to login when refresh fails definitively.

## Retry Final Failure

Retry plugin retries transient failures, then rethrows the final failure. Do not assume retry guarantees success.

Avoid retrying non-idempotent operations unless the backend operation is safe to replay.

## Production Logging

Log enough context for debugging, but never log secrets.

Good fields:

- method
- URL path without sensitive query values
- status
- duration
- trace ID
- endpoint error code/status

Avoid logging:

- Authorization headers
- cookies
- refresh tokens
- full request body for sensitive APIs
- personally identifiable data

Use `createObservabilityPlugin()` for centralized logging/metrics rather than scattering logs in API functions.
