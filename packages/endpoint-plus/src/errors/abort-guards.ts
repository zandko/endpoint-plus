import { isError, isPlainObject, isString } from 'es-toolkit';

/**
 * Check if the error is an AbortError.
 */
export function isAbortError(error: unknown): boolean {
  if (isError(error)) {
    return error.name === 'AbortError';
  }

  return isPlainObject(error) && isString(error.name) && error.name === 'AbortError';
}
