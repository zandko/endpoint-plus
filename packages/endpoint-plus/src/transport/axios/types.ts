import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { EndpointRequestConfig } from '../../types';

export interface AxiosTransportOptions {
  axiosDefaults?: AxiosRequestConfig;
  client?: AxiosInstance;
  defaults?: EndpointRequestConfig;
}
