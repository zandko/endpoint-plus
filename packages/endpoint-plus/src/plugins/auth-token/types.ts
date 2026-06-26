import type { Awaitable } from "../../types";
import type { InternalEndpointRequestConfig } from '../../types';

export interface AuthTokenPluginOptions {
  getToken?: string | ((config: InternalEndpointRequestConfig) => Awaitable<string | null>);
  headerName?: string;
  headerPrefix?: string;
  shouldAuthenticate?: (config: InternalEndpointRequestConfig) => boolean;
}
