import { EndpointError } from '../../errors/endpoint-error';
import type {
  EndpointRequestConfig,
  EndpointTransport,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
  RejectedHandler,
  RequestInterceptor,
  RequestMiddleware,
  ResponseInterceptor,
  ResponseRejectedHandler,
} from '../../types';
import {
  applyResponseErrorInterceptors,
  applyResponseInterceptors,
} from '../interceptors/pipeline';
import type { InterceptorRegistry } from '../interceptors/registry';
import { applyRequestMiddlewares, sendTransportRequest } from './middleware';
import { normalizeEndpointError } from './flow';
import { selectResponsePayload } from './response';
import { prepareEndpointRequestConfig } from './prepare';

export interface EndpointRequestExecutorOptions<TBody, TResponse> {
  config: EndpointRequestConfig<TBody, TResponse>;
  defaults: EndpointRequestConfig;
  requestMiddlewares: InterceptorRegistry<RequestMiddleware>;
  requestInterceptors: InterceptorRegistry<RequestInterceptor, RejectedHandler>;
  responseInterceptors: InterceptorRegistry<ResponseInterceptor, ResponseRejectedHandler>;
  transport?: EndpointTransport;
}

export async function executeEndpointRequest<
  TResponse = unknown,
  TResult = TResponse,
  TBody = unknown,
>(options: EndpointRequestExecutorOptions<TBody, TResponse>): Promise<TResult> {
  const requestConfig = await prepareRequestConfig(options);

  try {
    if (!options.transport) {
      throw new EndpointError('Endpoint transport is required before sending requests.', {
        config: requestConfig,
      });
    }

    const rawResponse = (await applyRequestMiddlewares(
      requestConfig,
      options.requestMiddlewares,
      (middlewareConfig) => sendTransportRequest(options.transport!, middlewareConfig),
    )) as EndpointTransportResponse<unknown, TBody>;
    const intercepted = await applyResponseInterceptors(rawResponse, options.responseInterceptors);
    return selectResponsePayload<TResult, TBody>(intercepted, requestConfig.returnMode);
  } catch (error) {
    const recovered = await applyResponseErrorInterceptors(error, options.responseInterceptors);
    if (recovered) {
      return selectResponsePayload<TResult, TBody>(
        recovered as EndpointTransportResponse<unknown, TBody>,
        requestConfig.returnMode,
      );
    }

    throw await normalizeEndpointError<TResponse, TBody>(error, options.responseInterceptors);
  }
}

async function prepareRequestConfig<TBody, TResponse>(
  options: EndpointRequestExecutorOptions<TBody, TResponse>,
): Promise<InternalEndpointRequestConfig<TBody>> {
  return prepareEndpointRequestConfig(options);
}
