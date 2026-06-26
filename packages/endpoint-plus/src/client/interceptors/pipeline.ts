import type {
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
  RejectedHandler,
  RequestInterceptor,
  ResponseInterceptor,
  ResponseRejectedHandler,
} from '../../types';
import { InterceptorRegistry } from './registry';

export async function applyRequestInterceptors<TBody>(
  config: InternalEndpointRequestConfig<TBody>,
  interceptors: InterceptorRegistry<RequestInterceptor, RejectedHandler>,
): Promise<InternalEndpointRequestConfig<TBody>> {
  let current = config;

  for (const interceptor of interceptors.values()) {
    try {
      current = interceptor.onFulfilled
        ? ((await interceptor.onFulfilled(current)) as InternalEndpointRequestConfig<TBody>)
        : current;
    } catch (error) {
      if (interceptor.onRejected) {
        await interceptor.onRejected(error);
      }
      throw error;
    }
  }

  return current;
}

export async function applyResponseInterceptors<TBody>(
  response: EndpointTransportResponse<unknown, TBody>,
  interceptors: InterceptorRegistry<ResponseInterceptor, ResponseRejectedHandler>,
): Promise<EndpointTransportResponse<unknown, TBody>> {
  let current = response;

  for (const interceptor of interceptors.values()) {
    try {
      current = interceptor.onFulfilled
        ? ((await interceptor.onFulfilled(current)) as EndpointTransportResponse<unknown, TBody>)
        : current;
    } catch (error) {
      if (interceptor.onRejected) {
        await interceptor.onRejected(error);
      }
      throw error;
    }
  }

  return current;
}

export async function applyResponseErrorInterceptors<TBody>(
  error: unknown,
  interceptors: InterceptorRegistry<ResponseInterceptor, ResponseRejectedHandler>,
): Promise<EndpointTransportResponse<unknown, TBody> | null> {
  for (const interceptor of interceptors.values()) {
    if (!interceptor.onRejected) {
      continue;
    }

    const response = await interceptor.onRejected(error);
    if (response) {
      return response as EndpointTransportResponse<unknown, TBody>;
    }
  }

  return null;
}
