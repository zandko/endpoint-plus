import type { Awaitable } from "../../types";
import type { InternalEndpointRequestConfig } from '../../types';

export interface RetryPluginOptions {
  delay?: number | ((context: RetryPluginContext) => Awaitable<number>);
  methods?: string[];
  onRetry?: (context: RetryPluginContext) => Awaitable<void>;
  retries?: number;
  shouldRetry?: (context: RetryPluginContext) => Awaitable<boolean>;
  statusCodes?: number[];
}

export interface RetryPluginContext {
  attempt: number;
  error: unknown;
  request: InternalEndpointRequestConfig;
  status?: number;
}
