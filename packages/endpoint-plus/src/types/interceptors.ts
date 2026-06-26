import type { Awaitable } from './shared';
import type { InternalEndpointRequestConfig } from './core';
import type { EndpointTransportResponse } from './transport';

export type RequestMiddlewareNext<D = unknown> = (
  config: InternalEndpointRequestConfig<D>,
) => Promise<EndpointTransportResponse<unknown, D>>;

export type RequestMiddleware<D = unknown> = (
  config: InternalEndpointRequestConfig<D>,
  next: RequestMiddlewareNext<D>,
) => Awaitable<EndpointTransportResponse<unknown, D>>;

export type RequestInterceptor<D = unknown> = (
  config: InternalEndpointRequestConfig<D>,
) => Awaitable<InternalEndpointRequestConfig<D>>;
export type RequestFulfilled<D = unknown> = RequestInterceptor<D>;

export type ResponseInterceptor = (
  response: EndpointTransportResponse,
) => Awaitable<EndpointTransportResponse>;
export type ResponseFulfilled = ResponseInterceptor;

export type RejectedHandler = (error: unknown) => unknown;
export type ResponseRejectedHandler = (
  error: unknown,
) => Awaitable<EndpointTransportResponse | null | undefined>;
