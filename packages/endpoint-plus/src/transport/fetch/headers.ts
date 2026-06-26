import { normalizeHeaderRecord } from '../../shared/header-records';

export function normalizeFetchHeaders(
  headers: HeadersInit | Record<string, unknown> | undefined,
): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (isFetchHeaders(headers)) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([key, value]) => [key, String(value)]));
  }

  return normalizeHeaderRecord(headers);
}

function isFetchHeaders(headers: unknown): headers is Headers {
  return typeof Headers !== 'undefined' && headers instanceof Headers;
}
