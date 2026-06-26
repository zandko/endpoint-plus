import type {
  EndpointHeaders,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
} from '../types';
import type { EndpointErrorCode } from './error-codes';

export class EndpointError<TData = unknown, TBody = unknown> extends Error {
  public override readonly cause?: unknown;
  public readonly code?: EndpointErrorCode | string | number;
  public readonly config?: InternalEndpointRequestConfig<TBody>;
  public readonly data?: TData;
  public readonly headers?: EndpointHeaders;
  public readonly response?: EndpointTransportResponse<TData, TBody>;
  public readonly status?: number;
  public readonly statusText?: string;

  constructor(message: string, options: EndpointErrorOptions<TData, TBody> = {}) {
    super(message);
    this.name = 'EndpointError';
    this.cause = options.cause;
    this.code = options.code;
    this.config = options.config;
    this.data = options.data;
    this.headers = options.headers ?? options.response?.headers;
    this.response = options.response;
    this.status = options.status ?? options.response?.status;
    this.statusText = options.statusText ?? options.response?.statusText;
  }

  get isNetworkError(): boolean {
    return this.code === 'ERR_NETWORK';
  }

  get isTimeout(): boolean {
    return this.code === 'ERR_TIMEOUT';
  }

  get isCancel(): boolean {
    return this.code === 'ERR_ABORTED';
  }
}

export interface EndpointErrorOptions<TData = unknown, TBody = unknown> {
  cause?: unknown;
  code?: EndpointErrorCode | string | number;
  config?: InternalEndpointRequestConfig<TBody>;
  data?: TData;
  headers?: EndpointHeaders;
  response?: EndpointTransportResponse<TData, TBody>;
  status?: number;
  statusText?: string;
}
