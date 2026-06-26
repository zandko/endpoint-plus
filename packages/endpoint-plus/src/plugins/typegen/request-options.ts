import type { EndpointTransportResponse } from '../../types';
import type { TypegenPluginOptions, TypegenRequestOptions } from './types';

export interface ResolvedTypegenOptions extends TypegenPluginOptions {
  name?: string;
}

export function resolveTypegenOptions(
  response: EndpointTransportResponse,
  defaults: TypegenPluginOptions,
): ResolvedTypegenOptions | undefined {
  if (defaults.enabled === false) {
    return undefined;
  }

  const requestOptions = response.config.extensions?.typegen;
  if (!requestOptions) {
    return undefined;
  }

  if (requestOptions === true) {
    return defaults;
  }

  return mergeTypegenOptions(defaults, requestOptions);
}

function mergeTypegenOptions(
  defaults: TypegenPluginOptions,
  requestOptions: TypegenRequestOptions,
): ResolvedTypegenOptions {
  return {
    ...defaults,
    ...requestOptions,
    rendererOptions: {
      ...defaults.rendererOptions,
      ...requestOptions.rendererOptions,
    },
  };
}
