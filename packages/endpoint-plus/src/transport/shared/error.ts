import { isError } from 'es-toolkit';
import type { EndpointTransportResponse, InternalEndpointRequestConfig } from '../../types';

export type EndpointTransportError = Error & {
  code?: string;
  config: InternalEndpointRequestConfig;
  response?: EndpointTransportResponse;
};

export function createTransportError(
  error: unknown,
  config: InternalEndpointRequestConfig,
  response?: EndpointTransportResponse,
  code?: string,
): EndpointTransportError {
  const normalized = isError(error) ? error : new Error(String(error));
  const transportError = normalized as EndpointTransportError;

  safeDefineProperty(transportError, 'config', config);

  if (response) {
    safeDefineProperty(transportError, 'response', response);
  }

  if (code) {
    safeDefineProperty(transportError, 'code', code);
  }

  return transportError;
}

function safeDefineProperty(obj: object, key: string, value: unknown): void {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);

    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(obj, key, {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else if (descriptor.writable) {
      (obj as Record<string, unknown>)[key] = value;
    }
  } catch {
    // Fallback for environments where defineProperty or getOwnPropertyDescriptor might fail
    try {
      (obj as Record<string, unknown>)[key] = value;
    } catch {
      // Ignore if everything fails
    }
  }
}
