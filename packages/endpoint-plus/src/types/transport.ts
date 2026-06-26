import type { EndpointRequestConfig, EndpointHeaders, InternalEndpointRequestConfig } from './core';

export interface EndpointTransportResponse<T = unknown, D = unknown> {
  data: T;
  status: number;
  statusText?: string;
  headers?: EndpointHeaders;
  config: InternalEndpointRequestConfig<D>;
  request?: unknown;
}

export interface EndpointTransport {
  request(config: InternalEndpointRequestConfig): Promise<EndpointTransportResponse>;
  setDefaults?(config: EndpointRequestConfig): void;
}

export type EndpointTransportInput =
  | EndpointTransport
  | (new (defaults?: EndpointRequestConfig) => EndpointTransport);
