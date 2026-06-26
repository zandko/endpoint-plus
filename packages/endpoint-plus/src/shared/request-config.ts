import type { EndpointHeaders, EndpointRequestConfig } from '../types';
import { mergeHeaderRecords } from './header-records';

export function mergeRequestConfig(...configs: EndpointRequestConfig[]): EndpointRequestConfig {
  return configs.reduce<EndpointRequestConfig>((merged, config) => {
    return {
      ...merged,
      ...config,
      headers: mergeHeaders(merged.headers, config.headers),
    };
  }, {});
}

export function mergeHeaders(base?: EndpointHeaders, override?: EndpointHeaders): EndpointHeaders {
  return mergeHeaderRecords(base, override);
}
