import { isError, isFunction } from 'es-toolkit';
import { EndpointError } from '../errors/endpoint-error';
import type { EndpointRequestConfig, InternalEndpointRequestConfig } from '../types';
import { resolveRequestTimeout } from '../shared/request-timeout';
import { buildRequestUrl } from '../shared/request-url';

export interface MiniappFileEndpoint {
  prepareRequestConfig<TBody = unknown, TResponse = unknown>(
    config: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<InternalEndpointRequestConfig<TBody>>;
}

export interface MiniappFileRuntime {
  downloadFile(options: MiniappDownloadFileRuntimeOptions): MiniappFileTask | void;
  uploadFile<TResponse = unknown>(
    options: MiniappUploadFileRuntimeOptions<TResponse>,
  ): MiniappFileTask | void;
}

export interface MiniappFileTask {
  abort?: () => void;
}

export interface MiniappUploadFileOptions {
  config?: EndpointRequestConfig;
  filePath: string;
  formData?: Record<string, unknown>;
  name: string;
  runtime: MiniappFileRuntime;
  url: string;
}

export interface MiniappDownloadFileOptions {
  config?: EndpointRequestConfig;
  runtime: MiniappFileRuntime;
  url: string;
}

export interface MiniappUploadFileResponse<TResponse = unknown> {
  data?: TResponse;
  header?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  status?: number;
  statusCode?: number;
}

export interface MiniappDownloadFileResponse {
  filePath?: string;
  header?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  status?: number;
  statusCode?: number;
  tempFilePath?: string;
}

export interface MiniappUploadFileRuntimeOptions<TResponse = unknown> {
  fail?: (error: unknown) => void;
  filePath: string;
  formData?: Record<string, unknown>;
  header?: Record<string, string>;
  name: string;
  success?: (response: MiniappUploadFileResponse<TResponse>) => void;
  timeout?: number;
  url: string;
}

export interface MiniappDownloadFileRuntimeOptions {
  fail?: (error: unknown) => void;
  header?: Record<string, string>;
  success?: (response: MiniappDownloadFileResponse) => void;
  timeout?: number;
  url: string;
}

export async function uploadFile<TResponse = unknown>(
  endpoint: MiniappFileEndpoint,
  options: MiniappUploadFileOptions,
): Promise<MiniappUploadFileResponse<TResponse>> {
  const config = await endpoint.prepareRequestConfig({
    ...options.config,
    method: 'POST',
    url: options.url,
  });

  return sendMiniappFileRequest<MiniappUploadFileResponse<TResponse>>(config, (handlers) =>
    options.runtime.uploadFile<TResponse>({
      fail: handlers.fail,
      filePath: options.filePath,
      formData: options.formData,
      header: config.headers,
      name: options.name,
      success: handlers.success,
      timeout: resolveRequestTimeout(config.timeout),
      url: buildRequestUrl(config),
    }),
  );
}

export async function downloadFile(
  endpoint: MiniappFileEndpoint,
  options: MiniappDownloadFileOptions,
): Promise<MiniappDownloadFileResponse> {
  const config = await endpoint.prepareRequestConfig({
    ...options.config,
    method: 'GET',
    url: options.url,
  });

  return sendMiniappFileRequest<MiniappDownloadFileResponse>(config, (handlers) =>
    options.runtime.downloadFile({
      fail: handlers.fail,
      header: config.headers,
      success: handlers.success,
      timeout: resolveRequestTimeout(config.timeout),
      url: buildRequestUrl(config),
    }),
  );
}

function sendMiniappFileRequest<TResponse extends { status?: number; statusCode?: number }>(
  config: InternalEndpointRequestConfig,
  send: (handlers: {
    fail(error: unknown): void;
    success(response: TResponse): void;
  }) => MiniappFileTask | void,
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    const fail = (error: unknown): void => {
      reject(
        new EndpointError(isError(error) ? error.message : String(error), { cause: error, config }),
      );
    };
    const success = (response: TResponse): void => {
      const status = response.statusCode ?? response.status ?? 0;
      if (status >= 400) {
        reject(
          new EndpointError(`Miniapp file request failed with status ${status}.`, {
            config,
            data: response,
            status,
          }),
        );
        return;
      }

      resolve(response);
    };

    const task = send({ fail, success });
    bindAbort(config.signal, task);
  });
}

function bindAbort(signal: AbortSignal | null | undefined, task: MiniappFileTask | void): void {
  if (!signal || !task || !isFunction(task.abort)) {
    return;
  }

  if (signal.aborted) {
    task.abort();
    return;
  }

  signal.addEventListener('abort', () => task.abort?.(), { once: true });
}
