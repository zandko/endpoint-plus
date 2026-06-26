import { describe, expect, it } from 'vitest';
import {
  downloadFile,
  uploadFile,
  type BrowserFileUploader,
  type EndpointDownloader,
} from '../../browser';
import type { EndpointRequestConfig } from '../../types';

describe('browser runtime helpers', () => {
  it('downloads blob data through the endpoint with a filename target', async () => {
    const calls: Array<EndpointRequestConfig> = [];
    const endpoint: EndpointDownloader = {
      async get<TResponse = unknown, TResult = TResponse>(
        _url: string,
        config?: EndpointRequestConfig,
      ) {
        calls.push(config ?? {});
        return new Blob(['hello endpoint']) as TResult;
      },
    };

    await expect(downloadFile(endpoint, '/report', 'report.txt')).resolves.toEqual({
      filename: 'report.txt',
    });
    expect(calls[0]).toMatchObject({
      responseType: 'blob',
      returnMode: 'data',
    });
  });

  it('uploads form data through the endpoint', async () => {
    const calls: Array<{ data?: unknown; config?: EndpointRequestConfig }> = [];
    const endpoint: BrowserFileUploader = {
      async post<TResponse = unknown, TResult = TResponse, TBody = unknown>(
        _url: string,
        data?: TBody,
        config?: EndpointRequestConfig<TBody, TResponse>,
      ) {
        calls.push({ config, data });
        return { ok: true } as TResult;
      },
    };

    await expect(uploadFile(endpoint, '/upload', { name: 'file' })).resolves.toEqual({ ok: true });
    expect(calls[0]?.data).toBeInstanceOf(FormData);
  });
});
