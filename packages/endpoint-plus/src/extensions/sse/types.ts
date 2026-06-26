import type { Awaitable } from "../../types";
import type { ParseError } from 'eventsource-parser';
import type { EndpointRequestConfig, FetchLike } from '../../types/core';

export interface EndpointSseEvent<T = string> {
  data: T;
  event: string;
  id?: string;
  raw: string;
}

export interface EndpointSseResult {
  error?: unknown;
  lastEventId?: string;
  response?: Response;
  retry?: number;
}

export type EndpointSseBufferStrategy = 'animation-frame' | 'timeout';

export interface EndpointSseBufferOptions {
  maxDelay?: number;
  maxSize?: number;
  strategy?: EndpointSseBufferStrategy;
}

export interface EndpointSseConfig<TData = string, TBody = unknown> extends EndpointRequestConfig<
  TBody,
  Response
> {
  deserialize?: (data: string, event: Omit<EndpointSseEvent<string>, 'data'>) => Awaitable<TData>;
  eventBuffer?: boolean | EndpointSseBufferOptions;
  fetch?: FetchLike;
  maxBufferSize?: number;
  onBatch?: (events: Array<EndpointSseEvent<TData>>) => Awaitable<void>;
  onClose?: (result: EndpointSseResult) => Awaitable<void>;
  onComment?: (comment: string) => Awaitable<void>;
  onEvent?: (event: EndpointSseEvent<TData>) => Awaitable<void>;
  onOpen?: (response: Response) => Awaitable<void>;
  onParseError?: (error: ParseError) => Awaitable<void>;
  onRetry?: (retry: number) => Awaitable<void>;
}
