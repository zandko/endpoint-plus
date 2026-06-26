import { describe, expect, it } from 'vitest';
import { createTransportError } from '../error';
import type { EndpointTransportResponse, InternalEndpointRequestConfig } from '../../../types';

describe('createTransportError', () => {
  it('should attach config and response to the error object', () => {
    const error = new Error('Original error');
    const config = {
      url: '/test',
      method: 'GET',
      headers: {},
      context: {},
    } as unknown as InternalEndpointRequestConfig;
    const response = {
      status: 401,
      data: {},
      headers: {},
      config,
    } as unknown as EndpointTransportResponse;

    const result = createTransportError(error, config, response, 'ERR_BAD_RESPONSE');

    expect(result).toBe(error);
    expect(result.config).toBe(config);
    expect(result.response).toBe(response);
    expect(result.code).toBe('ERR_BAD_RESPONSE');
  });

  it('should convert non-error to Error object', () => {
    const config = {
      url: '/test',
      method: 'GET',
      headers: {},
      context: {},
    } as unknown as InternalEndpointRequestConfig;
    const result = createTransportError('String error', config);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('String error');
    expect(result.config).toBe(config);
  });

  it('should NOT throw TypeError when setting response on an error with read-only but configurable response property', () => {
    const error = new Error('Original error');
    Object.defineProperty(error, 'response', {
      value: { original: true },
      writable: false,
      configurable: true,
    });

    const config = {
      url: '/test',
      method: 'GET',
      headers: {},
      context: {},
    } as unknown as InternalEndpointRequestConfig;
    const response = {
      status: 401,
      data: {},
      headers: {},
      config,
    } as unknown as EndpointTransportResponse;

    expect(() => {
      createTransportError(error, config, response);
    }).not.toThrow();
    expect((error as unknown as Record<string, unknown>).response).toBe(response);
  });

  it('should NOT throw if NOT configurable (it should just skip or fail silently)', () => {
    const error = new Error('Original error');
    const originalResponse = { original: true };
    Object.defineProperty(error, 'response', {
      value: originalResponse,
      writable: false,
      configurable: false,
    });

    const config = {
      url: '/test',
      method: 'GET',
      headers: {},
      context: {},
    } as unknown as InternalEndpointRequestConfig;
    const response = {
      status: 401,
      data: {},
      headers: {},
      config,
    } as unknown as EndpointTransportResponse;

    expect(() => {
      createTransportError(error, config, response);
    }).not.toThrow();
    // In this case, we expect it NOT to have changed because it's non-configurable and non-writable
    expect((error as unknown as Record<string, unknown>).response).toBe(originalResponse);
  });
});
