import type { Awaitable } from "../../types";
import type { EndpointExtension, EndpointExtensionClient } from '../../types';
import { runEndpointLongPolling, runEndpointPolling } from './polling';
import type { EndpointLongPollConfig, EndpointPollConfig } from './types';
import { POLLING_EXTENSION } from '../constants';

export interface EndpointPollingExtension {
  longPoll<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    callback: (response: TResult) => Awaitable<void>,
    config?: EndpointLongPollConfig<TResult, TBody>,
  ): Promise<void>;
  poll<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    config?: EndpointPollConfig<TResult, TBody>,
  ): Promise<TResult>;
}

export function createPollingExtension(): EndpointExtension<EndpointPollingExtension> {
  return {
    id: POLLING_EXTENSION,
    kind: 'extension',
    setup(client: EndpointExtensionClient) {
      return {
        longPoll(url, callback, config) {
          return runEndpointLongPolling(client, url, callback, config);
        },
        poll(url, config) {
          return runEndpointPolling(client, url, config);
        },
      } satisfies EndpointPollingExtension;
    },
  };
}

export { POLLING_EXTENSION };
export type { EndpointLongPollConfig, EndpointPollConfig };
