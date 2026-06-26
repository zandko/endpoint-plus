import type { Awaitable } from "../../types";
import type { EndpointRequestConfig } from '../../types/core';

export interface EndpointPollConfig<R, D = unknown> {
  interval?: number;
  maxAttempts?: number;
  stopCondition?: (response: R) => Awaitable<boolean>;
  request?: EndpointRequestConfig<D>;
}

export interface EndpointLongPollConfig<R, D = unknown> {
  interval?: number;
  signal?: AbortSignal;
  request?: EndpointRequestConfig<D>;
  onError?: (error: unknown) => Awaitable<void>;
  stopCondition?: (response: R) => Awaitable<boolean>;
}
