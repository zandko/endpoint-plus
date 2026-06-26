import type { EndpointRequestConfig, InternalEndpointRequestConfig } from './core';

export type EndpointExtensionId = symbol;

export interface EndpointExtensionClient {
  prepareRequestConfig<TBody = unknown, TResponse = unknown>(
    config: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<InternalEndpointRequestConfig<TBody>>;
  request<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    config: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
  get<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
  delete<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
  post<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
  put<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
  patch<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
}

export interface EndpointExtension<TExtension extends object = object> {
  id: EndpointExtensionId;
  kind: 'extension';
  setup(client: EndpointExtensionClient): TExtension | void;
}
