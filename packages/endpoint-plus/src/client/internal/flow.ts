import { EndpointError } from '../../errors/endpoint-error';
import type {
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
  ResponseInterceptor,
  ResponseRejectedHandler,
} from '../../types';
import type { InterceptorRegistry } from '../interceptors/registry';
import { applyResponseInterceptors } from '../interceptors/pipeline';
import { isAbortError } from '../../errors/abort-guards';
import { createAbortError } from '../../errors/abort-error';
import { isTransportError } from './response';

type ResponseInterceptors = InterceptorRegistry<ResponseInterceptor, ResponseRejectedHandler>;

export async function normalizeEndpointError<TResponse, TBody>(
  error: unknown,
  responseInterceptors: ResponseInterceptors,
): Promise<EndpointError<TResponse, TBody> | unknown> {
  if (isAbortError(error)) {
    return isTransportError<TBody>(error) && error.config ? createAbortError(error.config) : error;
  }

  if (isTransportError<TBody>(error)) {
    if (error.response) {
      const response = await applyResponseInterceptors<TBody>(error.response, responseInterceptors);
      return new EndpointError(error.message, {
        code: error.code,
        config: response.config as InternalEndpointRequestConfig<TBody>,
        data: response.data as TResponse,
        response: response as EndpointTransportResponse<TResponse, TBody>,
        cause: error,
      });
    }

    return new EndpointError(error.message, {
      code: error.code,
      config: error.config as InternalEndpointRequestConfig<TBody>,
      cause: error,
    });
  }

  return error;
}
