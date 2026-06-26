import { isNumber } from 'es-toolkit';
import type {
  EndpointPlugin,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
} from '../../types';
import { EndpointError } from '../../errors/endpoint-error';
import { RETRY_PLUGIN } from '../constants';
import { isAbortError } from '../../errors/abort-guards';
import { createAbortError } from '../../errors/abort-error';
import { isRequestAborted } from '../../shared/request-abort';
import {
  cloneRequestConfig,
  getErrorResponse,
  getRequestConfig,
} from '../../shared/request-error-context';
import type { RetryPluginContext, RetryPluginOptions } from './types';

const defaultRetries = 2;
const defaultDelay = 300;
const defaultMethods = ['GET', 'HEAD', 'OPTIONS'];
const defaultStatusCodes = [408, 429, 500, 502, 503, 504];

export function createRetryPlugin(options: RetryPluginOptions = {}): EndpointPlugin {
  const methods = new Set(options.methods ?? defaultMethods);
  const statusCodes = new Set(options.statusCodes ?? defaultStatusCodes);
  const retries = options.retries ?? defaultRetries;

  return {
    id: RETRY_PLUGIN,
    kind: 'plugin',
    setup(client) {
      client.registerResponseInterceptor(undefined, async (error) => {
        const request = getRequestConfig(error);
        if (
          !request ||
          request.context?.disableRetry ||
          request.context?.isRefresh ||
          isRequestAborted(request) ||
          isAbortError(error)
        ) {
          return undefined;
        }

        const attempt = getRetryAttempt(request);
        const context: RetryPluginContext = {
          attempt,
          error,
          request,
          status: getErrorResponse(error)?.status,
        };

        if (!(await shouldRetryRequest(context, { methods, options, retries, statusCodes }))) {
          return undefined;
        }

        await waitForRetryDelay(context, options);
        if (isRequestAborted(request)) {
          throw createAbortError(request);
        }
        await options.onRetry?.(context);

        const retryRequest = cloneRequestConfig(request);
        retryRequest.context = {
          ...retryRequest.context,
          retryAttempt: attempt + 1,
        };

        return client.request<unknown, EndpointTransportResponse, unknown>({
          ...retryRequest,
          returnMode: 'response',
        });
      });
    },
  };
}

async function shouldRetryRequest(
  context: RetryPluginContext,
  runtime: {
    methods: Set<string>;
    options: RetryPluginOptions;
    retries: number;
    statusCodes: Set<number>;
  },
): Promise<boolean> {
  if (context.attempt >= runtime.retries) {
    return false;
  }

  if (!runtime.methods.has(String(context.request.method).toUpperCase())) {
    return false;
  }

  if (runtime.options.shouldRetry) {
    return runtime.options.shouldRetry(context);
  }

  if (context.error instanceof EndpointError) {
    if (context.error.isNetworkError || context.error.isTimeout) {
      return true;
    }
  } else if (typeof context.error === 'object' && context.error !== null) {
    const code = (context.error as Record<string, unknown>).code;
    if (code === 'ERR_NETWORK' || code === 'ERR_TIMEOUT') {
      return true;
    }
  }

  if (!isNumber(context.status)) {
    return false;
  }

  return runtime.statusCodes.has(context.status);
}

async function waitForRetryDelay(
  context: RetryPluginContext,
  options: RetryPluginOptions,
): Promise<void> {
  const delay = options.delay ?? defaultDelay;
  const timeout = isNumber(delay) ? delay : await delay(context);

  if (timeout <= 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const signal = context.request.signal;
    if (signal?.aborted) {
      reject(createAbortError(context.request));
      return;
    }

    const timer = setTimeout(resolve, timeout);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(createAbortError(context.request));
      },
      { once: true },
    );
  });
}

function getRetryAttempt(request: InternalEndpointRequestConfig): number {
  return Number(request.context?.retryAttempt ?? 0);
}
