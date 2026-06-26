import type {
  EndpointRequestConfig,
  InternalEndpointRequestConfig,
  RejectedHandler,
  RequestInterceptor,
} from '../../types';
import { applyRequestInterceptors } from '../interceptors/pipeline';
import type { InterceptorRegistry } from '../interceptors/registry';
import { removeHeader } from '../../shared/header-records';
import { mergeHeaders, mergeRequestConfig } from '../../shared/request-config';

export interface PrepareRequestConfigOptions<TBody, TResponse> {
  config: EndpointRequestConfig<TBody, TResponse>;
  defaults: EndpointRequestConfig;
  requestInterceptors: InterceptorRegistry<RequestInterceptor, RejectedHandler>;
}

export async function prepareEndpointRequestConfig<TBody, TResponse>(
  options: PrepareRequestConfigOptions<TBody, TResponse>,
): Promise<InternalEndpointRequestConfig<TBody>> {
  const requestConfig = mergeRequestConfig(
    options.defaults,
    options.config,
  ) as InternalEndpointRequestConfig<TBody>;
  requestConfig.method = String(requestConfig.method ?? 'GET').toUpperCase();
  requestConfig.headers = mergeHeaders(requestConfig.headers);

  if (typeof FormData !== 'undefined' && requestConfig.data instanceof FormData) {
    requestConfig.headers = removeHeader(requestConfig.headers, 'content-type');
  }

  return applyRequestInterceptors(requestConfig, options.requestInterceptors);
}
