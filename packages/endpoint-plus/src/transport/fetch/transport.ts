import { createFetch, type $Fetch } from 'ofetch';
import type {
  EndpointRequestConfig,
  EndpointTransport,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
} from '../../types';
import { mergeRequestConfig } from '../../shared/request-config';
import { normalizeFetchError } from './error';
import { toOfetchRequest } from './request-options';
import { toFetchTransportResponse } from './response';
import { getRuntimeFetch } from './runtime';
import type { FetchTransportOptions } from './types';

export function createFetchTransport(options: FetchTransportOptions = {}): EndpointTransport {
  return new FetchTransport(options);
}

export class FetchTransport implements EndpointTransport {
  private defaults: EndpointRequestConfig;
  private fetchClient: $Fetch;

  constructor(options: FetchTransportOptions = {}) {
    this.defaults = options.defaults ?? {};
    this.fetchClient = createFetch({
      fetch: (options.fetch ?? getRuntimeFetch()) as typeof globalThis.fetch,
    });
  }

  setDefaults(config: EndpointRequestConfig): void {
    this.defaults = config;
  }

  async request(config: InternalEndpointRequestConfig): Promise<EndpointTransportResponse> {
    const finalConfig = mergeRequestConfig(this.defaults, config) as InternalEndpointRequestConfig;
    const response = await this.send(finalConfig);

    return toFetchTransportResponse(response, finalConfig);
  }

  private async send(config: InternalEndpointRequestConfig) {
    try {
      const request = toOfetchRequest(config);
      return await this.fetchClient.raw(request.url, request.options);
    } catch (error) {
      throw normalizeFetchError(error, config);
    }
  }
}
