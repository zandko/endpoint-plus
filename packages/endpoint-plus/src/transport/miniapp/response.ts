import type { EndpointTransportResponse, InternalEndpointRequestConfig } from '../../types';
import { normalizeHeaderRecord } from '../../shared/header-records';
import { deserializeResponseData } from '../../shared/payload-codec';
import type { MiniappResponse } from './types';

export function toMiniappTransportResponse(
  response: MiniappResponse,
  config: InternalEndpointRequestConfig,
): EndpointTransportResponse {
  return {
    config,
    data: deserializeResponseData(response.data, { ...response, config }),
    headers: normalizeHeaderRecord(response.header ?? response.headers),
    status: response.statusCode ?? response.status ?? 0,
    statusText: response.errMsg,
  };
}
