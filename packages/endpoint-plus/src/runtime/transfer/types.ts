import type { EndpointRequestConfig } from '../../types';

export interface EndpointDownloader {
  get<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
}
