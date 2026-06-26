import type { EndpointRequestConfig } from '../../types';

export interface MiniappTransportOptions {
  defaults?: EndpointRequestConfig;
  request?: MiniappRequest;
  runtime?: MiniappRuntime;
}

export interface MiniappRuntime {
  request: MiniappRequest;
}

export type MiniappRequest = (
  options: MiniappRequestOptions,
) => MiniappRequestTask | Promise<MiniappResponse> | void;

export interface MiniappRequestOptions {
  complete?: (response: unknown) => void;
  data?: unknown;
  dataType?: string;
  fail?: (error: unknown) => void;
  header?: Record<string, string>;
  method?: string;
  responseType?: 'arraybuffer' | 'text';
  success?: (response: MiniappResponse) => void;
  timeout?: number;
  url: string;
}

export interface MiniappRequestTask {
  abort?: () => void;
}

export interface MiniappResponse {
  data?: unknown;
  errMsg?: string;
  header?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  status?: number;
  statusCode?: number;
}
