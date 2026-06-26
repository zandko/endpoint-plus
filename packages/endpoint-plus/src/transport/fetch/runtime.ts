import { isFunction } from 'es-toolkit';
import type { FetchLike } from '../../types';

export function getRuntimeFetch(): FetchLike {
  if (isFunction(globalThis.fetch)) {
    return globalThis.fetch.bind(globalThis);
  }

  throw new Error(
    'No fetch implementation found. Provide one with createFetchTransport({ fetch }) for this runtime.',
  );
}
