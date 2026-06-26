import type { FetchResponse } from 'ofetch';
import type { EndpointTransportResponse, InternalEndpointRequestConfig } from '../../types';
import { deserializeResponseData } from '../../shared/payload-codec';
import { normalizeFetchHeaders } from './headers';

export function toFetchTransportResponse(
  response: FetchResponse<unknown>,
  config: InternalEndpointRequestConfig,
): EndpointTransportResponse {
  return {
    config,
    data: deserializeResponseData(response['_data'], { ...response, config }),
    headers: normalizeFetchHeaders(response.headers),
    status: response.status,
    statusText: response.statusText,
  };
}
