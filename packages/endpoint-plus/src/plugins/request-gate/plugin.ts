import { isNumber } from 'es-toolkit';
import { EndpointError } from '../../errors/endpoint-error';
import type {
  EndpointPlugin,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
  RequestMiddlewareNext,
} from '../../types';
import { REQUEST_GATE_PLUGIN } from '../constants';
import { createAbortError } from '../../errors/abort-error';
import { cloneTransportResponse } from '../../shared/transport-response';
import { createRequestGateKey } from './key';
import type { RequestGatePluginOptions, RequestGateRequestOptions } from './types';

const defaultWait = 300;

interface DebounceEntry {
  cancel: () => void;
}

export function createRequestGatePlugin(options: RequestGatePluginOptions = {}): EndpointPlugin {
  const inflight = new Map<string, Promise<EndpointTransportResponse>>();
  const debounced = new Map<string, DebounceEntry>();
  const throttleTimestamps = new Map<string, number>();

  return {
    id: REQUEST_GATE_PLUGIN,
    kind: 'plugin',
    setup(client) {
      client.registerRequestMiddleware((config, next) => {
        const gate = resolveRequestGate(config, options);
        if (!gate) {
          return next(config);
        }

        const key = createRequestGateKey(config, gate.key);

        if (gate.mode === 'dedupe') {
          return applyDedupe(config, next, gate, key, inflight);
        }

        if (gate.mode === 'debounce') {
          return applyDebounce(config, next, gate, key, debounced);
        }

        return applyThrottle(config, next, gate, key, inflight, throttleTimestamps);
      });
    },
  };
}

function resolveRequestGate(
  config: InternalEndpointRequestConfig,
  options: RequestGatePluginOptions,
): RequestGateRequestOptions | null {
  const gate = config.extensions?.requestGate;
  if (
    gate === false ||
    !gate ||
    config.context?.isRefresh ||
    config.context?.isRefreshTokenRetry ||
    config.context?.retryAttempt !== undefined
  ) {
    return null;
  }

  return options.shouldGate?.(config) === false ? null : gate;
}

async function applyDedupe(
  config: InternalEndpointRequestConfig,
  next: RequestMiddlewareNext,
  gate: RequestGateRequestOptions,
  key: string,
  inflight: Map<string, Promise<EndpointTransportResponse>>,
): Promise<EndpointTransportResponse> {
  const pending = inflight.get(key);
  if (pending) {
    if ((gate.behavior ?? 'reuse') === 'reject') {
      throw createRequestGateError(config, 'Duplicate request was blocked.');
    }

    return cloneTransportResponse(await pending, config);
  }

  const request = next(config);
  inflight.set(key, request);

  try {
    return await request;
  } finally {
    inflight.delete(key);
  }
}

function applyDebounce(
  config: InternalEndpointRequestConfig,
  next: RequestMiddlewareNext,
  gate: RequestGateRequestOptions,
  key: string,
  debounced: Map<string, DebounceEntry>,
): Promise<EndpointTransportResponse> {
  debounced.get(key)?.cancel();

  return new Promise<EndpointTransportResponse>((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timer);
      config.signal?.removeEventListener('abort', abort);
      if (debounced.get(key) === entry) {
        debounced.delete(key);
      }
    };

    const abort = (): void => {
      cleanup();
      reject(createAbortError(config));
    };

    const timer = setTimeout(async () => {
      cleanup();

      try {
        resolve(await next(config));
      } catch (error) {
        reject(error);
      }
    }, resolveWait(gate.wait));

    const entry: DebounceEntry = {
      cancel: () => {
        cleanup();
        reject(createRequestGateError(config, 'Debounced request was replaced.'));
      },
    };

    debounced.set(key, entry);
    config.signal?.addEventListener('abort', abort, { once: true });
    if (config.signal?.aborted) {
      abort();
    }
  });
}

async function applyThrottle(
  config: InternalEndpointRequestConfig,
  next: RequestMiddlewareNext,
  gate: RequestGateRequestOptions,
  key: string,
  inflight: Map<string, Promise<EndpointTransportResponse>>,
  throttleTimestamps: Map<string, number>,
): Promise<EndpointTransportResponse> {
  const now = Date.now();
  const wait = resolveWait(gate.wait);
  const lastStartedAt = throttleTimestamps.get(key) ?? 0;

  if (now - lastStartedAt < wait) {
    const pending = inflight.get(key);
    if (pending && gate.behavior === 'reuse') {
      return cloneTransportResponse(await pending, config);
    }

    throw createRequestGateError(config, 'Throttled request was blocked.');
  }

  throttleTimestamps.set(key, now);

  // Automatically clean up the timestamp after the wait period to prevent memory leaks
  setTimeout(() => {
    if (throttleTimestamps.get(key) === now) {
      throttleTimestamps.delete(key);
    }
  }, wait);

  const request = next(config);
  inflight.set(key, request);

  try {
    return await request;
  } finally {
    inflight.delete(key);
  }
}

function createRequestGateError(
  config: InternalEndpointRequestConfig,
  message: string,
): EndpointError {
  return new EndpointError(message, { config });
}

function resolveWait(wait: number | undefined): number {
  return isNumber(wait) ? wait : defaultWait;
}
