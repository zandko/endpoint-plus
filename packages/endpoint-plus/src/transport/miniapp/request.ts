import { isFunction, isPromise } from 'es-toolkit';
import type { InternalEndpointRequestConfig } from '../../types';
import { toMiniappRequestOptions } from './request-options';
import { normalizeMiniappError } from './error';
import type { MiniappRequest, MiniappRequestTask, MiniappResponse } from './types';

export function sendMiniappRequest(
  request: MiniappRequest,
  config: InternalEndpointRequestConfig,
): Promise<MiniappResponse> {
  return new Promise((resolve, reject) => {
    let task: MiniappRequestTask | Promise<MiniappResponse> | void;

    const success = (response: MiniappResponse): void => {
      const status = response.statusCode ?? response.status ?? 0;
      if (status >= 400) {
        reject(
          normalizeMiniappError(
            response.errMsg ?? `Request failed with status ${status}`,
            config,
            response,
          ),
        );
        return;
      }

      resolve(response);
    };
    const fail = (error: unknown): void => {
      reject(normalizeMiniappError(error, config));
    };

    try {
      task = request(toMiniappRequestOptions(config, { fail, success }));
    } catch (error) {
      fail(error);
      return;
    }

    if (isPromise(task)) {
      task.then(success, fail);
    }

    bindAbort(config.signal, task);
  });
}

function bindAbort(
  signal: AbortSignal | null | undefined,
  task: MiniappRequestTask | Promise<MiniappResponse> | void,
): void {
  if (!signal || !task || !('abort' in task) || !isFunction(task.abort)) {
    return;
  }

  if (signal.aborted) {
    task.abort();
    return;
  }

  signal.addEventListener('abort', () => task.abort?.(), { once: true });
}
