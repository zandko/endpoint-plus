import { isError, isPlainObject, isString } from 'es-toolkit';
import type {
  EndpointRequestConfig,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
} from '../../types';

export function selectResponsePayload<TResult, TBody>(
  response: EndpointTransportResponse<unknown, TBody>,
  mode: EndpointRequestConfig['returnMode'],
): TResult {
  if (mode === 'response') {
    return response as unknown as TResult;
  }

  return response.data as unknown as TResult;
}

export function isTransportError<TBody>(error: unknown): error is {
  code?: string | number;
  config?: InternalEndpointRequestConfig<TBody>;
  message: string;
  response?: EndpointTransportResponse<unknown, TBody>;
} {
  return isError(error) || (isPlainObject(error) && isString(error.message));
}
