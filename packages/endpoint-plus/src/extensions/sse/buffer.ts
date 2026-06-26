import type { Awaitable } from "../../types";
import { isNotNil, isPlainObject } from 'es-toolkit';
import type { EndpointSseBufferOptions, EndpointSseEvent } from './types';

const defaultMaxDelay = 16;
const defaultMaxSize = 50;

export interface SseEventBuffer<TData> {
  flush(): Promise<void>;
  push(event: EndpointSseEvent<TData>): Promise<void>;
}

export function createSseEventBuffer<TData>(
  options: boolean | EndpointSseBufferOptions | undefined,
  onBatch: ((events: Array<EndpointSseEvent<TData>>) => Awaitable<void>) | undefined,
): SseEventBuffer<TData> | undefined {
  if (!options || !onBatch) {
    return undefined;
  }

  const config = normalizeBufferOptions(options);
  let batch: Array<EndpointSseEvent<TData>> = [];
  let flushPromise = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame: number | undefined;

  const clearSchedule = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    if (isNotNil(frame) && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
  };

  const flush = async (): Promise<void> => {
    clearSchedule();

    if (batch.length === 0) {
      return flushPromise;
    }

    const events = batch;
    batch = [];
    flushPromise = flushPromise.then(() => onBatch(events));

    return flushPromise;
  };

  const schedule = (): void => {
    if (timer || isNotNil(frame)) {
      return;
    }

    if (config.strategy === 'animation-frame' && typeof requestAnimationFrame !== 'undefined') {
      frame = requestAnimationFrame(() => {
        frame = undefined;
        void flush();
      });
      return;
    }

    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, config.maxDelay);
  };

  return {
    flush,
    async push(event) {
      batch.push(event);

      if (batch.length >= config.maxSize) {
        await flush();
        return;
      }

      schedule();
    },
  };
}

function normalizeBufferOptions(
  options: boolean | EndpointSseBufferOptions,
): Required<EndpointSseBufferOptions> {
  const strategy =
    isPlainObject(options) && options.strategy ? options.strategy : 'animation-frame';
  const maxDelay = isPlainObject(options) && options.maxDelay ? options.maxDelay : defaultMaxDelay;
  const maxSize = isPlainObject(options) && options.maxSize ? options.maxSize : defaultMaxSize;

  return {
    maxDelay,
    maxSize,
    strategy,
  };
}
