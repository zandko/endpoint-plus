import { createParser, type EventSourceMessage, type ParseError } from 'eventsource-parser';
import type { InternalEndpointRequestConfig } from '../../types';
import type { EndpointSseConfig, EndpointSseEvent, EndpointSseResult } from './types';
import { createSseEventBuffer } from './buffer';

type SseEventBuffer<TData> = ReturnType<typeof createSseEventBuffer<TData>>;

export async function consumeSseResponse<TData>(
  response: Response,
  config: InternalEndpointRequestConfig,
  options: EndpointSseConfig<TData>,
): Promise<EndpointSseResult> {
  const decoder = new TextDecoder();
  const reader = response.body!.getReader();
  const state: Omit<EndpointSseResult, 'response'> = {};
  const eventBuffer = createSseEventBuffer(options.eventBuffer, options.onBatch);
  let callbacks = Promise.resolve();

  const parser = createParser({
    maxBufferSize: options.maxBufferSize,
    onComment(comment) {
      callbacks = callbacks.then(() => options.onComment?.(comment));
    },
    onError(error) {
      callbacks = callbacks.then(() => options.onParseError?.(error as ParseError));
    },
    onEvent(message) {
      callbacks = callbacks.then(() =>
        handleSseMessage(message, config, options, state, eventBuffer),
      );
    },
    onRetry(retry) {
      state.retry = retry;
      callbacks = callbacks.then(() => options.onRetry?.(retry));
    },
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      parser.feed(decoder.decode(value, { stream: true }));
      await callbacks;
      callbacks = Promise.resolve();
    }

    const remaining = decoder.decode();
    if (remaining) {
      parser.feed(remaining);
    }
    parser.reset({ consume: true });
    await callbacks;
  } finally {
    await eventBuffer?.flush();
    reader.releaseLock();
  }

  return { ...state, response };
}

async function handleSseMessage<TData>(
  message: EventSourceMessage,
  config: InternalEndpointRequestConfig,
  options: EndpointSseConfig<TData>,
  state: Omit<EndpointSseResult, 'response'>,
  eventBuffer: SseEventBuffer<TData>,
): Promise<void> {
  const event = message.event ?? 'message';
  const rawEvent: Omit<EndpointSseEvent<string>, 'data'> = {
    event,
    id: message.id,
    raw: message.data,
  };
  const data = options.deserialize
    ? await options.deserialize(message.data, rawEvent)
    : (message.data as TData);

  state.lastEventId = message.id ?? state.lastEventId;

  const sseEvent = {
    ...rawEvent,
    data,
  };

  await options.onEvent?.(sseEvent);
  await eventBuffer?.push(sseEvent);

  config.onDownloadProgress?.({
    loaded: message.data.length,
    event: message,
  });
}
