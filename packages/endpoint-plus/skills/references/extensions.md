# Extensions

## Table of Contents

- [Extension vs Plugin](#extension-vs-plugin)
- [TypeScript Rule](#typescript-rule)
- [Polling](#polling)
- [Long Polling](#long-polling)
- [SSE](#sse)
- [SSE Event Buffer](#sse-event-buffer)
- [Workflow](#workflow)
- [Runtime Compatibility](#runtime-compatibility)
- [When to Create a Custom Extension](#when-to-create-a-custom-extension)

## Extension vs Plugin

Extensions add methods to a client instance. Plugins register lifecycle hooks.

| Kind | Adds client methods | Registers lifecycle hooks | Example |
|------|---------------------|---------------------------|---------|
| Extension | Yes | No | `createPollingExtension()` |
| Plugin | No | Yes | `createRetryPlugin()` |

Use extensions for new client capabilities such as `poll()`, `sse()`, `all()`, `sequence()`, or `pipeline()`. Use plugins for auth, retry, cache, telemetry, envelope parsing, and request/response interception.

## TypeScript Rule

Assign `.use()` return values when installing extensions. This preserves added methods in TypeScript.

```ts
import { createPollingExtension } from '@yw/endpoint-plus/extensions/polling';

const endpointWithPolling = endpoint.use(createPollingExtension());
await endpointWithPolling.poll('/jobs/1');
```

Avoid:

```ts
endpoint.use(createPollingExtension());
await endpoint.poll('/jobs/1'); // runtime may work, but TS type is still the core client
```

## Polling

Import:

```ts
import { createPollingExtension } from '@yw/endpoint-plus/extensions/polling';
```

Use `poll()` when a job/status endpoint should be repeatedly fetched until done.

```ts
const endpointWithPolling = endpoint.use(createPollingExtension());

const job = await endpointWithPolling.poll<{ done: boolean; result?: string }>('/jobs/1', {
  interval: 1000,
  maxAttempts: 20,
  stopCondition: (response) => response.done,
});
```

`poll()` repeatedly sends `GET` requests until `stopCondition` returns `true` or `maxAttempts` is reached.

Options:

| Option | Purpose |
|--------|---------|
| `interval` | Delay between attempts in milliseconds |
| `maxAttempts` | Maximum request attempts |
| `stopCondition` | Return `true` to stop and resolve with current response |
| `request` | Extra endpoint request config passed to each poll request |

## Long Polling

Use `longPoll()` when each response should be delivered to a callback and polling continues until aborted or stopped.

```ts
const controller = new AbortController();

await endpointWithPolling.longPoll(
  '/notifications',
  async (message: { done?: boolean; text: string }) => {
    console.log(message.text);
  },
  {
    interval: 3000,
    signal: controller.signal,
    stopCondition: (message) => message.done === true,
    onError: async (error) => {
      console.error(error);
    },
  },
);
```

Options:

| Option | Purpose |
|--------|---------|
| `interval` | Delay between requests |
| `signal` | Abort long polling with `AbortController` |
| `request` | Extra endpoint request config |
| `onError` | Observe errors during long polling |
| `stopCondition` | Return `true` to stop after a response |

## SSE

Import:

```ts
import { createSseExtension } from '@yw/endpoint-plus/extensions/sse';
```

Use `sse()` for AI chat streams, notifications, and `text/event-stream` endpoints.

```ts
const endpointWithSse = endpoint.use(createSseExtension());

await endpointWithSse.sse<{ text: string }>('/chat/stream', {
  method: 'POST',
  data: { prompt: 'hello' },
  deserialize: (data) => JSON.parse(data),
  onOpen: (response) => {
    console.log('stream opened', response.status);
  },
  onEvent: ({ event, data }) => {
    console.log(event, data.text);
  },
  onClose: ({ error, lastEventId, retry }) => {
    console.log('stream closed', { error, lastEventId, retry });
  },
});
```

SSE requests reuse endpoint defaults, request interceptors, auth token injection, URL params, and body serializers. SSE intentionally bypasses the normal response envelope pipeline because the response is consumed as a stream.

Important options:

| Option | Purpose |
|--------|---------|
| `deserialize` | Convert raw SSE `data` string to typed value |
| `eventBuffer` | Batch high-frequency events |
| `fetch` | Override fetch implementation |
| `maxBufferSize` | Limit parser buffer size |
| `onBatch` | Receive buffered events |
| `onClose` | Called on normal completion or stream failure |
| `onComment` | Observe SSE comments |
| `onEvent` | Receive each parsed event |
| `onOpen` | Called after response opens |
| `onParseError` | Observe parser errors |
| `onRetry` | Observe server-provided retry value |

Failed stream requests reject with `EndpointError`, and `onClose` runs for both normal completion and failures.

## SSE Event Buffer

For high-frequency AI token streams, batch UI updates with `eventBuffer`.

```ts
await endpointWithSse.sse<string>('/chat/stream', {
  eventBuffer: {
    maxDelay: 16,
    maxSize: 50,
    strategy: 'animation-frame',
  },
  onBatch: (events) => {
    appendTokens(events.map((event) => event.data).join(''));
  },
});
```

Options:

| Option | Purpose |
|--------|---------|
| `maxDelay` | Maximum wait before flushing buffered events |
| `maxSize` | Maximum event count in one batch |
| `strategy` | `'animation-frame'` for browser UI batching, `'timeout'` for timer batching |

Remaining buffered events flush when the stream ends or fails.

## Workflow

Import:

```ts
import { createWorkflowExtension } from '@yw/endpoint-plus/extensions/workflow';
```

Use workflow helpers for simple request orchestration.

```ts
const endpointWithWorkflow = endpoint.use(createWorkflowExtension());

const [profile, settings] = await endpointWithWorkflow.all([
  { url: '/profile' },
  { url: '/settings' },
]);

const ordered = await endpointWithWorkflow.sequence([
  { url: '/step-one' },
  { url: '/step-two' },
]);

const result = await endpointWithWorkflow.pipeline(1, [
  (value) => Number(value) + 1,
  async (value, client) => {
    await client.get('/audit');
    return Number(value) * 2;
  },
]);
```

Methods:

| Method | Behavior |
|--------|----------|
| `all(requests)` | Run requests concurrently with `Promise.all` |
| `sequence(requests)` | Run requests one by one in order |
| `pipeline(input, steps)` | Pass a value through async steps; each step can use the endpoint client |

Keep business-specific orchestration in the consuming project when it grows beyond simple request sequencing.

## Runtime Compatibility

| Capability | Browser | Node 22+ | SSR server runtime | Miniapp |
|------------|---------|----------|--------------------|---------|
| Polling | Yes | Yes | Yes | Yes |
| Workflow | Yes | Yes | Yes | Yes |
| SSE | Yes | Yes | Server runtime only | No |

SSE requires a fetch implementation with readable response streams. It is not supported by the miniapp transport.

## When to Create a Custom Extension

Create a custom extension when the project needs a reusable client method that composes endpoint requests, for example:

- `uploadAndPoll()`
- `createWorkflowJob()`
- `subscribeToChatStream()`
- domain-specific orchestration helpers

Do not create an extension just to add headers, retry, cache, logging, or envelope parsing. Those are plugin responsibilities.

For custom extension authoring, read `${CURRENT_SKILL_PATH}/references/customization.md`.
