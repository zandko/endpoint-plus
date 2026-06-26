import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { isBlob, isFunction, isString } from 'es-toolkit';
import type { EndpointDownloader } from '../runtime/transfer/types';
import { resolveUploadBody } from '../runtime/transfer';
import type { EndpointRequestConfig } from '../types';

export type { EndpointDownloader } from '../runtime/transfer/types';

export interface NodeDownloadFileResult {
  bytesWritten: number;
  path: string;
}

export interface NodeFileUploader {
  post<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: EndpointRequestConfig<TBody, TResponse>,
  ): Promise<TResult>;
}

export async function downloadFile(
  endpoint: EndpointDownloader,
  url: string,
  path: string,
  config: EndpointRequestConfig = {},
): Promise<NodeDownloadFileResult> {
  const data = await endpoint.get<DownloadData>(url, {
    ...config,
    responseType: config.responseType ?? 'stream',
    returnMode: 'data',
  });

  await mkdir(dirname(path), { recursive: true });

  const counter = createByteCounter();
  await pipeline(toNodeReadable(data), counter, createWriteStream(path));

  return {
    bytesWritten: counter.bytesWritten,
    path,
  };
}

type DownloadData =
  | ArrayBuffer
  | Blob
  | NodeJS.ReadableStream
  | ReadableStream
  | Uint8Array
  | string;

function toNodeReadable(data: DownloadData): NodeJS.ReadableStream {
  if (data instanceof Readable) {
    return data;
  }

  if (isWebReadableStream(data)) {
    return Readable.fromWeb(data as unknown as NodeReadableStream<Uint8Array>);
  }

  if (data instanceof ArrayBuffer) {
    return Readable.from([new Uint8Array(data)]);
  }

  if (data instanceof Uint8Array || isString(data)) {
    return Readable.from([data]);
  }

  if (isBlob(data)) {
    return Readable.fromWeb(data.stream() as unknown as NodeReadableStream<Uint8Array>);
  }

  return data;
}

function isWebReadableStream(data: unknown): data is ReadableStream {
  return (
    typeof ReadableStream !== 'undefined' &&
    data instanceof ReadableStream &&
    isFunction(data.getReader)
  );
}

function createByteCounter(): Transform & { bytesWritten: number } {
  let bytesWritten = 0;
  const counter = new Transform({
    transform(chunk: Buffer | string, _encoding, callback) {
      bytesWritten += Buffer.byteLength(chunk);
      callback(null, chunk);
    },
  }) as Transform & { bytesWritten: number };

  Object.defineProperty(counter, 'bytesWritten', {
    get: () => bytesWritten,
  });

  return counter;
}

export function uploadFile<TResponse = unknown, TResult = TResponse>(
  endpoint: NodeFileUploader,
  url: string,
  data?: FormData | Record<string, unknown>,
  config: EndpointRequestConfig<FormData, TResponse> = {},
): Promise<TResult> {
  return endpoint.post<TResponse, TResult, FormData>(url, resolveUploadBody(data), config);
}
