import { isFunction } from 'es-toolkit';
import type { EndpointPlugin, InternalEndpointRequestConfig } from '../../types';
import { getHeader } from '../../shared/header-records';
import { AUTH_TOKEN_PLUGIN } from '../constants';
import type { AuthTokenPluginOptions } from './types';

export function createAuthTokenPlugin(options: AuthTokenPluginOptions = {}): EndpointPlugin {
  return {
    id: AUTH_TOKEN_PLUGIN,
    kind: 'plugin',
    setup(client) {
      client.registerRequestInterceptor(async (config) => {
        if (!shouldAttachToken(config, options)) {
          return config;
        }

        const token = await resolveToken(config, options);
        if (!token) {
          return config;
        }

        const headerName = options.headerName ?? 'Authorization';
        const headerPrefix = config.headerPrefix ?? options.headerPrefix ?? 'Bearer ';
        config.headers[headerName] = token.startsWith(headerPrefix)
          ? token
          : `${headerPrefix}${token}`;
        return config;
      });
    },
  };
}

function shouldAttachToken(
  config: InternalEndpointRequestConfig,
  options: AuthTokenPluginOptions,
): boolean {
  if (config.context?.isRefresh) {
    return false;
  }

  const headerName = options.headerName ?? 'Authorization';
  if (config.context?.isRefreshTokenRetry && getHeader(config.headers, headerName)) {
    return false;
  }

  if (options.shouldAuthenticate) {
    return options.shouldAuthenticate(config);
  }

  return Boolean(config.requireAuth || options.getToken || config.setAuthorizationHeader);
}

async function resolveToken(
  config: InternalEndpointRequestConfig,
  options: AuthTokenPluginOptions,
): Promise<string | null> {
  const tokenSource = config.setAuthorizationHeader ?? options.getToken;

  if (isFunction(tokenSource)) {
    return tokenSource(config);
  }

  return tokenSource ?? null;
}
