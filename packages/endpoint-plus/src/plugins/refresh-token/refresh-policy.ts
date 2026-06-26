import { getErrorResponse } from '../../shared/request-error-context';
import type { RefreshTokenPluginOptions } from './types';

export function shouldRefresh<TResult, TBody>(
  error: unknown,
  options: RefreshTokenPluginOptions<TResult, TBody>,
): boolean {
  return options.shouldRefresh ? options.shouldRefresh(error) : defaultShouldRefresh(error);
}

function defaultShouldRefresh(error: unknown): boolean {
  const response = getErrorResponse(error);
  return response?.status === 401;
}
