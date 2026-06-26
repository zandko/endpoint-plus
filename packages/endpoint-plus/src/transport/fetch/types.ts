import type { EndpointRequestConfig, FetchLike } from '../../types';

export interface FetchTransportOptions {
  defaults?: EndpointRequestConfig;
  fetch?: FetchLike;
}
