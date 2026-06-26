import axios, { type AxiosInstance } from 'axios';
import type {
  EndpointRequestConfig,
  EndpointTransport,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
} from '../../types';
import { mergeRequestConfig } from '../../shared/request-config';
import { normalizeAxiosError } from './error';
import { toAxiosRequestConfig } from './request-options';
import { toAxiosTransportResponse } from './response';
import type { AxiosTransportOptions } from './types';

export function createAxiosTransport(options: AxiosTransportOptions = {}): EndpointTransport {
  return new AxiosTransport(options);
}

export class AxiosTransport implements EndpointTransport {
  private client: AxiosInstance;
  private defaults: EndpointRequestConfig;

  constructor(options: AxiosTransportOptions = {}) {
    this.client = options.client ?? axios.create(options.axiosDefaults);
    this.defaults = options.defaults ?? {};
  }

  setDefaults(config: EndpointRequestConfig): void {
    this.defaults = config;
  }

  async request(config: InternalEndpointRequestConfig): Promise<EndpointTransportResponse> {
    const requestConfig = mergeRequestConfig(
      this.defaults,
      config,
    ) as InternalEndpointRequestConfig;

    try {
      const response = await this.client.request(toAxiosRequestConfig(requestConfig));
      return toAxiosTransportResponse(response, requestConfig);
    } catch (error) {
      throw normalizeAxiosError(error, requestConfig);
    }
  }
}
