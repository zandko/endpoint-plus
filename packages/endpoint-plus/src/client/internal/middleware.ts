import type {
  EndpointTransport,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
  RequestMiddleware,
} from '../../types';
import type { InterceptorRegistry } from '../interceptors/registry';

export function applyRequestMiddlewares<TBody>(
  config: InternalEndpointRequestConfig<TBody>,
  middlewares: InterceptorRegistry<RequestMiddleware>,
  send: (config: InternalEndpointRequestConfig<TBody>) => Promise<EndpointTransportResponse>,
): Promise<EndpointTransportResponse<unknown, TBody>> {
  const stack = middlewares
    .values()
    .map((handler) => handler.onFulfilled)
    .filter((middleware): middleware is RequestMiddleware => Boolean(middleware));

  let index = -1;

  async function dispatch(
    currentConfig: InternalEndpointRequestConfig<TBody>,
  ): Promise<EndpointTransportResponse<unknown, TBody>> {
    index += 1;
    const middleware = stack[index];

    if (!middleware) {
      return send(currentConfig) as Promise<EndpointTransportResponse<unknown, TBody>>;
    }

    let nextCalled = false;
    const response = await middleware(currentConfig, async (nextConfig) => {
      if (nextCalled) {
        throw new Error('Request middleware called next() multiple times.');
      }

      nextCalled = true;
      return dispatch(nextConfig as InternalEndpointRequestConfig<TBody>);
    });

    return response as EndpointTransportResponse<unknown, TBody>;
  }

  return dispatch(config);
}

export function sendTransportRequest(
  transport: EndpointTransport,
  config: InternalEndpointRequestConfig,
): Promise<EndpointTransportResponse> {
  return transport.request(config);
}
