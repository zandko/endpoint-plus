import { isBlob, isBrowser } from 'es-toolkit';
import type { EndpointDownloader } from '../runtime/transfer/types';
import { resolveUploadBody } from '../runtime/transfer';
import type { EndpointRequestConfig } from '../types';

export type { EndpointDownloader } from '../runtime/transfer/types';

export interface BrowserDownloadFileResult {
  filename: string;
}

export interface BrowserFileUploader {
  post<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
}

export async function downloadFile(
  endpoint: EndpointDownloader,
  url: string,
  filename?: string,
  config: EndpointRequestConfig = {},
): Promise<BrowserDownloadFileResult> {
  const data = await endpoint.get<Blob>(url, {
    ...config,
    responseType: 'blob',
    returnMode: 'data',
  });
  const resolvedFilename = filename ?? String(Date.now());

  saveBrowserFile(data, resolvedFilename);

  return {
    filename: resolvedFilename,
  };
}

export function saveBrowserFile(response: unknown, filename?: string): void {
  if (!isBrowser() || !isBlob(response)) {
    return;
  }

  const blobUrl = window.URL.createObjectURL(response);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename ?? String(Date.now());
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);
}

export function uploadFile<TResponse = unknown, TResult = TResponse>(
  endpoint: BrowserFileUploader,
  url: string,
  data?: FormData | Record<string, unknown>,
  config: EndpointRequestConfig<FormData, TResponse> = {},
): Promise<TResult> {
  return endpoint.post<TResponse, TResult, FormData>(url, resolveUploadBody(data), config);
}
