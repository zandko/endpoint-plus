import type { RefreshTokenPluginOptions } from './types';

export async function resolveAccessToken<TResult, TBody>(
  result: TResult,
  options: RefreshTokenPluginOptions<TResult, TBody>,
): Promise<string | null> {
  if (options.resolveAccessToken) {
    return options.resolveAccessToken(result);
  }

  return options.getAccessToken?.() ?? null;
}
