import type { EndpointRequestConfig } from '../types';

export const defaultConfig: Required<
  Pick<EndpointRequestConfig, 'headers' | 'method' | 'returnMode'>
> = {
  method: 'GET',
  headers: {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json; charset=utf-8',
  },
  returnMode: 'data',
};
