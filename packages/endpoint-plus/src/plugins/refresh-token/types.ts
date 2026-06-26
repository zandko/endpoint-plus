import type { Awaitable } from "../../types";
import type { EndpointRequestConfig, InternalEndpointRequestConfig } from '../../types';

export type RefreshTokenRequest<TResult = unknown, TBody = unknown> =
  | EndpointRequestConfig<TBody, TResult>
  | ((context: RefreshTokenContext) => Awaitable<EndpointRequestConfig<TBody, TResult>>);

export interface RefreshTokenPluginOptions<TResult = unknown, TBody = unknown> {
  getAccessToken?: () => Awaitable<string | null>;
  headerName?: string;
  headerPrefix?: string;
  onRefresh?: (result: TResult) => Awaitable<void>;
  refreshRequest: RefreshTokenRequest<TResult, TBody>;
  resolveAccessToken?: (result: TResult) => string | null;
  shouldRefresh?: (error: unknown) => boolean;
}

export interface RefreshTokenContext {
  error: unknown;
  request: InternalEndpointRequestConfig;
}
