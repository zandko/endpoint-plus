import type { Awaitable } from "../../types";
import { delay } from 'es-toolkit';
import { EndpointError } from '../../errors/endpoint-error';
import type { EndpointRequestConfig } from '../../types';
import type { EndpointLongPollConfig, EndpointPollConfig } from './types';

interface EndpointReader {
  get<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
}

export async function runEndpointPolling<TResponse = unknown, TResult = TResponse, TBody = unknown>(
  client: EndpointReader,
  url: string,
  config: EndpointPollConfig<TResult, TBody> = {},
): Promise<TResult> {
  const interval = config.interval ?? 3000;
  const maxAttempts = config.maxAttempts ?? Number.POSITIVE_INFINITY;
  const requestConfig = config.request ?? {};

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await client.get<TResponse, TResult, TBody>(
      url,
      requestConfig as EndpointRequestConfig<TBody, TResponse>,
    );
    if (!config.stopCondition || (await config.stopCondition(response))) {
      return response;
    }

    if (attempt < maxAttempts) {
      await delay(interval);
    }
  }

  throw new EndpointError('Polling reached maxAttempts without satisfying stopCondition.');
}

export async function runEndpointLongPolling<
  TResponse = unknown,
  TResult = TResponse,
  TBody = unknown,
>(
  client: EndpointReader,
  url: string,
  callback: (response: TResult) => Awaitable<void>,
  config: EndpointLongPollConfig<TResult, TBody> = {},
): Promise<void> {
  while (!config.signal?.aborted) {
    try {
      const response = await client.get<TResponse, TResult, TBody>(
        url,
        config.request as EndpointRequestConfig<TBody, TResponse>,
      );
      await callback(response);
      if (await config.stopCondition?.(response)) {
        return;
      }
    } catch (error) {
      await config.onError?.(error);
      if (!config.onError) {
        throw error;
      }
    }

    await delay(config.interval ?? 3000);
  }
}
