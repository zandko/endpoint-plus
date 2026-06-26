import { isNumber } from 'es-toolkit';
import type { EndpointRequestConfig } from '../types';

export function resolveRequestTimeout(
  timeout: EndpointRequestConfig['timeout'],
): number | undefined {
  return isNumber(timeout) ? timeout : undefined;
}
