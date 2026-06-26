import type { EndpointExtension, EndpointExtensionClient } from '../../types';
import { streamEndpointEvents } from './stream';
import type { EndpointSseConfig, EndpointSseEvent, EndpointSseResult } from './types';
import { SSE_EXTENSION } from '../constants';

export interface EndpointSseExtension {
  sse<TData = string, TBody = unknown>(
    url: string,
    config?: EndpointSseConfig<TData, TBody>,
  ): Promise<EndpointSseResult>;
}

export function createSseExtension(): EndpointExtension<EndpointSseExtension> {
  return {
    id: SSE_EXTENSION,
    kind: 'extension',
    setup(client: EndpointExtensionClient) {
      return {
        sse(url, config = {}) {
          return streamEndpointEvents({
            client,
            config,
            url,
          });
        },
      } satisfies EndpointSseExtension;
    },
  };
}

export { SSE_EXTENSION };
export type { EndpointSseConfig, EndpointSseEvent, EndpointSseResult };
