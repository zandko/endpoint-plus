import type {
  EndpointRequestConfig,
  EndpointTransport,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
} from '../../types';
import { mergeRequestConfig } from '../../shared/request-config';
import { sendMiniappRequest } from './request';
import { resolveMiniappRequest } from './runtime';
import { toMiniappTransportResponse } from './response';
import type { MiniappRequest, MiniappTransportOptions } from './types';

export function createMiniappTransport(options: MiniappTransportOptions): EndpointTransport {
  return new MiniappTransport(options);
}

export class MiniappTransport implements EndpointTransport {
  private defaults: EndpointRequestConfig;
  private requestAdapter: MiniappRequest;

  constructor(options: MiniappTransportOptions) {
    this.defaults = options.defaults ?? {};
    this.requestAdapter = resolveMiniappRequest(options);
  }

  setDefaults(config: EndpointRequestConfig): void {
    this.defaults = config;
  }

  async request(config: InternalEndpointRequestConfig): Promise<EndpointTransportResponse> {
    const finalConfig = mergeRequestConfig(this.defaults, config) as InternalEndpointRequestConfig;
    const response = await sendMiniappRequest(this.requestAdapter, finalConfig);

    return toMiniappTransportResponse(response, finalConfig);
  }
}
