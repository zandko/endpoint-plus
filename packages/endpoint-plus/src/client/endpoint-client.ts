import { isFunction } from 'es-toolkit';
import {
  type EndpointExtension,
  type EndpointPlugin,
  type EndpointRouteResponse,
  type EndpointRequestConfig,
  type EndpointTransport,
  type EndpointTransportInput,
  type InternalEndpointRequestConfig,
  type RejectedHandler,
  type RequestInterceptor,
  type RequestMiddleware,
  type ResponseInterceptor,
  type ResponseRejectedHandler,
} from '../types';
import { mergeRequestConfig } from '../shared/request-config';
import { defaultConfig } from './defaults';
import { InterceptorRegistry } from './interceptors/registry';
import { executeEndpointRequest } from './internal/executor';
import { prepareEndpointRequestConfig } from './internal/prepare';

/**
 * Core client for managing and executing endpoint requests.
 * Provides support for interceptors, middleware, and a robust plugin system.
 */
export class EndpointClient {
  private defaults: EndpointRequestConfig;
  private requestMiddlewares = new InterceptorRegistry<RequestMiddleware>();
  private requestInterceptors = new InterceptorRegistry<RequestInterceptor, RejectedHandler>();
  private responseInterceptors = new InterceptorRegistry<
    ResponseInterceptor,
    ResponseRejectedHandler
  >();
  private transport?: EndpointTransport;

  /**
   * Creates an instance of EndpointClient.
   * @param defaults Optional default configuration for all requests.
   */
  constructor(defaults: EndpointRequestConfig = {}) {
    this.defaults = mergeRequestConfig(defaultConfig, defaults);
  }

  /**
   * Sets the transport layer adapter for the client.
   * @param transport A transport instance or a constructor for one.
   */
  setTransport(transport: EndpointTransportInput): void {
    if (isFunction(transport)) {
      const Transport = transport as new (defaults?: EndpointRequestConfig) => EndpointTransport;
      this.transport = new Transport(this.defaults);
      return;
    }

    this.transport = transport as EndpointTransport;
  }

  /**
   * Updates the global default request configuration.
   * @param config New default configuration values.
   */
  setDefaults(config: EndpointRequestConfig): void {
    this.defaults = mergeRequestConfig(this.defaults, config);
    this.transport?.setDefaults?.(this.defaults);
  }

  /**
   * Installs a plugin into the client.
   * @param plugin The plugin to install.
   * @returns The current EndpointClient instance for chaining.
   */
  use(plugin: EndpointPlugin): this;
  use<TExtension extends object>(extension: EndpointExtension<TExtension>): this & TExtension;
  use<TExtension extends object>(
    extension: EndpointExtension<TExtension> | EndpointPlugin,
  ): this | (this & TExtension) {
    const methods = extension.setup(this);
    if (methods) {
      for (const key in methods) {
        if (key in this) {
          console.warn(
            `[EndpointClient] Plugin property conflict: "${key}" is already defined on the client instance. The existing property will be overwritten.`,
          );
        }
      }
      Object.assign(this, methods);
    }

    return this as this & TExtension;
  }

  /**
   * Registers a request interceptor.
   * @param onFulfilled Logic to run before the request is sent.
   * @param onRejected Logic to run if the request fails early.
   * @returns A unique identifier for the registered interceptor.
   */
  registerRequestInterceptor(
    onFulfilled?: RequestInterceptor,
    onRejected?: RejectedHandler,
  ): number {
    return this.requestInterceptors.use(onFulfilled, onRejected);
  }

  /**
   * Registers a request middleware (Onion model).
   * @param middleware The middleware function to register.
   * @returns A unique identifier for the registered middleware.
   */
  registerRequestMiddleware(middleware: RequestMiddleware): number {
    return this.requestMiddlewares.use(middleware);
  }

  /**
   * Unregisters a previously registered request middleware.
   * @param id The ID of the middleware to eject.
   */
  ejectRequestMiddleware(id: number): void {
    this.requestMiddlewares.eject(id);
  }

  /**
   * Unregisters a previously registered request interceptor.
   * @param id The ID of the interceptor to eject.
   */
  ejectRequestInterceptor(id: number): void {
    this.requestInterceptors.eject(id);
  }

  /**
   * Registers a response interceptor.
   * @param onFulfilled Logic to run after a successful response.
   * @param onRejected Logic to run when a request or response fails.
   * @returns A unique identifier for the registered interceptor.
   */
  registerResponseInterceptor(
    onFulfilled?: ResponseInterceptor,
    onRejected?: ResponseRejectedHandler,
  ): number {
    return this.responseInterceptors.use(onFulfilled, onRejected);
  }

  /**
   * Unregisters a previously registered response interceptor.
   * @param id The ID of the interceptor to eject.
   */
  ejectResponseInterceptor(id: number): void {
    this.responseInterceptors.eject(id);
  }

  /**
   * Executes a generic endpoint request.
   * @param config Configuration for the request.
   * @returns The processed response result.
   */
  request<const TConfig extends EndpointRequestConfig>(
    config: TConfig,
  ): Promise<
    TConfig extends { method: infer TMethod extends string; url: infer TUrl extends string }
      ? EndpointRouteResponse<TMethod, TUrl>
      : unknown
  >;
  request<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    config: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
  async request<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    config: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult> {
    return executeEndpointRequest<TResponse, TResult, TBody>({
      config,
      defaults: this.defaults,
      requestMiddlewares: this.requestMiddlewares,
      requestInterceptors: this.requestInterceptors,
      responseInterceptors: this.responseInterceptors,
      transport: this.transport,
    });
  }

  /**
   * Pre-processes a request configuration into an internal format.
   * @param config The original request configuration.
   * @returns A promise resolving to the normalized internal configuration.
   */
  prepareRequestConfig<TBody = unknown, TResponse = unknown>(
    config: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<InternalEndpointRequestConfig<TBody>> {
    return prepareEndpointRequestConfig({
      config,
      defaults: this.defaults,
      requestInterceptors: this.requestInterceptors,
    });
  }

  /**
   * Performs a GET request.
   * @param url Request path or URL.
   * @param config Request configuration options.
   */
  get<const TUrl extends string>(
    url: TUrl,
    config?: EndpointRequestConfig<unknown, EndpointRouteResponse<'GET', TUrl>>,
  ): Promise<EndpointRouteResponse<'GET', TUrl>>;
  get<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
  get<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    config: EndpointRequestConfig<TBody, TResponse> = {},
  ): Promise<TResult> {
    return this._request<TResponse, TResult, TBody>('GET', url, config);
  }

  /**
   * Performs a DELETE request.
   * @param url Request path or URL.
   * @param config Request configuration options.
   */
  delete<const TUrl extends string>(
    url: TUrl,
    config?: EndpointRequestConfig<unknown, EndpointRouteResponse<'DELETE', TUrl>>,
  ): Promise<EndpointRouteResponse<'DELETE', TUrl>>;
  delete<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
  delete<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    config: EndpointRequestConfig<TBody, TResponse> = {},
  ): Promise<TResult> {
    return this._request<TResponse, TResult, TBody>('DELETE', url, config);
  }

  /**
   * Performs a POST request.
   * @param url Request path or URL.
   * @param data Payload to send in the body.
   * @param config Request configuration options.
   */
  post<const TUrl extends string, TBody = unknown>(
    url: TUrl,
    data?: TBody,
    config?: EndpointRequestConfig<TBody, EndpointRouteResponse<'POST', TUrl>>,
  ): Promise<EndpointRouteResponse<'POST', TUrl>>;
  post<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
  post<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config: EndpointRequestConfig<TBody, TResponse> = {},
  ): Promise<TResult> {
    return this._request<TResponse, TResult, TBody>('POST', url, config, data, true);
  }

  /**
   * Performs a PUT request.
   * @param url Request path or URL.
   * @param data Payload to send in the body.
   * @param config Request configuration options.
   */
  put<const TUrl extends string, TBody = unknown>(
    url: TUrl,
    data?: TBody,
    config?: EndpointRequestConfig<TBody, EndpointRouteResponse<'PUT', TUrl>>,
  ): Promise<EndpointRouteResponse<'PUT', TUrl>>;
  put<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
  put<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config: EndpointRequestConfig<TBody, TResponse> = {},
  ): Promise<TResult> {
    return this._request<TResponse, TResult, TBody>('PUT', url, config, data, true);
  }

  /**
   * Performs a PATCH request.
   * @param url Request path or URL.
   * @param data Payload to send in the body.
   * @param config Request configuration options.
   */
  patch<const TUrl extends string, TBody = unknown>(
    url: TUrl,
    data?: TBody,
    config?: EndpointRequestConfig<TBody, EndpointRouteResponse<'PATCH', TUrl>>,
  ): Promise<EndpointRouteResponse<'PATCH', TUrl>>;
  patch<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
  patch<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config: EndpointRequestConfig<TBody, TResponse> = {},
  ): Promise<TResult> {
    return this._request<TResponse, TResult, TBody>('PATCH', url, config, data, true);
  }

  /**
   * Internal dispatcher for unified request handling.
   */
  private _request<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    method: NonNullable<EndpointRequestConfig['method']>,
    url: string,
    config: EndpointRequestConfig<TBody, TResponse>,
    data?: TBody,
    hasBody = false,
  ): Promise<TResult> {
    const requestConfig = hasBody ? { ...config, method, url, data } : { ...config, method, url };
    return this.request<TResponse, TResult, TBody>(requestConfig);
  }
}

/**
 * Factory function to create a new EndpointClient instance.
 * @param defaultConfig Optional default configuration.
 * @returns A fresh EndpointClient instance.
 */
export function createEndpointClient(defaultConfig?: EndpointRequestConfig): EndpointClient {
  return new EndpointClient(defaultConfig);
}

/** Alias for createEndpointClient. */
export const createInstance = createEndpointClient;
/** Alias for the EndpointClient class. */
export const Endpoint = EndpointClient;
