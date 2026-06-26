import type { Awaitable } from "../../types";
import type { EndpointTransportResponse, InternalEndpointRequestConfig } from '../../types';

export interface ObservabilityPluginOptions {
  now?: () => number;
  onError?: (event: ObservabilityErrorEvent) => Awaitable<void>;
  onRequest?: (event: ObservabilityRequestEvent) => Awaitable<void>;
  onResponse?: (event: ObservabilityResponseEvent) => Awaitable<void>;
}

export interface ObservabilityRequestEvent {
  request: InternalEndpointRequestConfig;
  startedAt: number;
}

export interface ObservabilityResponseEvent extends ObservabilityRequestEvent {
  duration: number;
  endedAt: number;
  response: EndpointTransportResponse;
}

export interface ObservabilityErrorEvent extends ObservabilityRequestEvent {
  duration: number;
  endedAt: number;
  error: unknown;
}
