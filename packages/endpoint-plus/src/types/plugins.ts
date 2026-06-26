import type { EndpointExtensionClient } from './extensions';
import type {
  RejectedHandler,
  RequestMiddleware,
  RequestInterceptor,
  ResponseInterceptor,
  ResponseRejectedHandler,
} from './interceptors';

export type EndpointPluginId = symbol;

export interface EndpointPlugin {
  id: EndpointPluginId;
  kind: 'plugin';
  setup(client: EndpointPluginClient): void;
}

export interface EndpointPluginClient extends EndpointExtensionClient {
  registerRequestInterceptor(
    onFulfilled?: RequestInterceptor,
    onRejected?: RejectedHandler,
  ): number;
  registerRequestMiddleware(middleware: RequestMiddleware): number;
  registerResponseInterceptor(
    onFulfilled?: ResponseInterceptor,
    onRejected?: ResponseRejectedHandler,
  ): number;
}
