# Runtime File Helpers

## Table of Contents

- [Purpose](#purpose)
- [Browser Upload and Download](#browser-upload-and-download)
- [Node Upload and Download](#node-upload-and-download)
- [Miniapp Upload and Download](#miniapp-upload-and-download)
- [Auth and Interceptor Behavior](#auth-and-interceptor-behavior)
- [Choosing Helpers](#choosing-helpers)

## Purpose

Use runtime helper subpaths for upload/download work so bundles do not mix browser, Node, and miniapp APIs.

| Runtime | Entry |
|---------|-------|
| Browser | `@yw/endpoint-plus/browser` |
| Node | `@yw/endpoint-plus/node` |
| Miniapp | `@yw/endpoint-plus/miniapp` |

These helpers work with an endpoint instance but keep runtime-specific file APIs outside the core client.

## Browser Upload and Download

```ts
import { downloadFile, uploadFile } from '@yw/endpoint-plus/browser';
import { endpoint } from '@/shared/endpoint';

export function uploadAvatar(file: File) {
  const form = new FormData();
  form.append('file', file);
  return uploadFile(endpoint, '/upload/avatar', form);
}

export function downloadMonthlyReport() {
  return downloadFile(endpoint, '/reports/monthly.xlsx', 'monthly.xlsx');
}
```

Browser `downloadFile()` requests a Blob and saves it through an object URL + anchor click.

Browser `uploadFile()` accepts `FormData` or a record and posts it as upload body.

## Node Upload and Download

```ts
import { downloadFile, uploadFile } from '@yw/endpoint-plus/node';
import { endpoint } from './endpoint';

export function uploadReport(formData: FormData) {
  return uploadFile(endpoint, '/upload/report', formData);
}

export function downloadReport() {
  return downloadFile(endpoint, '/reports/monthly.xlsx', './downloads/monthly.xlsx');
}
```

Node `downloadFile()` writes with streams by default, so large downloads do not need to be buffered fully in memory when the active transport supports stream responses.

## Miniapp Upload and Download

Use the transport subpath for request transport:

```ts
import { createMiniappTransport } from '@yw/endpoint-plus/transports/miniapp';

endpoint.setTransport(createMiniappTransport({ runtime: wx }));
```

Use the miniapp runtime entry for file helpers:

```ts
import { downloadFile, uploadFile } from '@yw/endpoint-plus/miniapp';

export function uploadMiniappFile(filePath: string) {
  return uploadFile(endpoint, {
    filePath,
    name: 'file',
    runtime: wx,
    url: '/upload',
  });
}

export function downloadMiniappFile() {
  return downloadFile(endpoint, {
    runtime: wx,
    url: '/reports/monthly.xlsx',
  });
}
```

The same pattern works with `uni` when the runtime is compatible with `wx.request`, `wx.uploadFile`, and `wx.downloadFile` style APIs.

## Auth and Interceptor Behavior

Miniapp file helpers call `endpoint.prepareRequestConfig()` first, so request interceptors such as auth token injection still apply.

They do **not** run request middlewares because `wx.uploadFile` and `wx.downloadFile` are not normal request transports. Do not expect request-cache, retry middleware, or request-gate middleware to wrap miniapp upload/download automatically.

For browser/node helpers, upload/download go through endpoint methods and therefore participate in the normal endpoint request lifecycle.

## Choosing Helpers

| Need | Use |
|------|-----|
| Browser save-as download | `@yw/endpoint-plus/browser` `downloadFile()` |
| Browser form upload | `@yw/endpoint-plus/browser` `uploadFile()` |
| Node stream download to disk | `@yw/endpoint-plus/node` `downloadFile()` |
| Node form upload | `@yw/endpoint-plus/node` `uploadFile()` |
| Miniapp upload/download task | `@yw/endpoint-plus/miniapp` helpers |
| Accurate browser upload progress | axios transport or custom transport |
