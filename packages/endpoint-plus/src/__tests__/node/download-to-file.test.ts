import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import {
  downloadFile,
  uploadFile,
  type EndpointDownloader,
  type NodeFileUploader,
} from '../../node';
import type { EndpointRequestConfig } from '../../types';

const tempDirs: string[] = [];

describe('node runtime helpers', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { force: true, recursive: true })));
    tempDirs.length = 0;
  });

  it('writes endpoint binary response to a node file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'endpoint-plus-'));
    tempDirs.push(dir);
    const path = join(dir, 'report.txt');
    const requests: EndpointRequestConfig[] = [];
    const endpoint: EndpointDownloader = {
      async get<TResponse = unknown, TResult = TResponse>(_url: string, config = {}) {
        requests.push(config);
        return Readable.from(['hello ', 'endpoint']) as TResult;
      },
    };

    await expect(downloadFile(endpoint, '/report', path)).resolves.toEqual({
      bytesWritten: 14,
      path,
    });
    await expect(readFile(path, 'utf8')).resolves.toBe('hello endpoint');
    expect(requests[0]?.responseType).toBe('stream');
  });

  it('uploads form data through the endpoint', async () => {
    const calls: Array<{ data?: unknown; config?: EndpointRequestConfig }> = [];
    const endpoint: NodeFileUploader = {
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
