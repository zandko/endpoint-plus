import type { EndpointTransportResponse, InternalEndpointRequestConfig } from '../types';

export function cloneTransportResponse(
  response: EndpointTransportResponse,
  config: InternalEndpointRequestConfig,
): EndpointTransportResponse {
  return {
    ...response,
    config,
    headers: response.headers ? { ...response.headers } : response.headers,
  };
}
