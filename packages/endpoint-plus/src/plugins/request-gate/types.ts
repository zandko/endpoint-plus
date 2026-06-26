import type { InternalEndpointRequestConfig } from '../../types';

declare global {
  namespace YwEndpoint {
    interface RequestExtensions {
      requestGate?: false | RequestGateRequestOptions;
    }
  }
}

export type RequestGateMode = 'debounce' | 'dedupe' | 'throttle';
export type RequestGateBehavior = 'reject' | 'reuse';
export type RequestGateKeyResolver = string | ((config: InternalEndpointRequestConfig) => string);

export interface RequestGateRequestOptions {
  behavior?: RequestGateBehavior;
  key?: RequestGateKeyResolver;
  mode: RequestGateMode;
  wait?: number;
}

export interface RequestGatePluginOptions {
  shouldGate?: (config: InternalEndpointRequestConfig) => boolean;
}
