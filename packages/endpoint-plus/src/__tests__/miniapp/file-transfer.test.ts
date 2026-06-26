import { describe, expect, it } from 'vitest';
import { createInstance } from '../../index';
import { createAuthTokenPlugin } from '../../plugins/auth-token';
import {
  uploadFile,
  type MiniappFileRuntime,
  type MiniappUploadFileResponse,
  type MiniappUploadFileRuntimeOptions,
} from '../../miniapp';

describe('miniapp file helpers', () => {
  it('uploads files with prepared endpoint headers and url', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const runtime: MiniappFileRuntime = {
      downloadFile() {},
      uploadFile<TResponse = unknown>(options: MiniappUploadFileRuntimeOptions<TResponse>) {
        calls.push(options as unknown as Record<string, unknown>);
        options.success?.({
          data: { ok: true },
          statusCode: 200,
        } as MiniappUploadFileResponse<TResponse>);
      },
    };
    const endpoint = createInstance({ baseURL: 'https://api.example.com' }).use(
      createAuthTokenPlugin({ getToken: 'access-token' }),
    );

    await expect(
      uploadFile(endpoint, {
        filePath: '/tmp/avatar.png',
        name: 'file',
        runtime,
        url: '/upload',
      }),
    ).resolves.toMatchObject({
      data: { ok: true },
    });

    expect(calls[0]).toMatchObject({
      filePath: '/tmp/avatar.png',
      header: expect.objectContaining({
        Authorization: 'Bearer access-token',
      }),
      name: 'file',
      url: 'https://api.example.com/upload',
    });
  });
});
