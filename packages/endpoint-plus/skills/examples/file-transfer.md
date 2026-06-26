# Example: File Transfer

Use this when a business project needs upload/download helpers.

## Browser

```ts
import { downloadFile, uploadFile } from '@yw/endpoint-plus/browser';
import { endpoint } from '@/shared/endpoint';

export function uploadAvatar(file: File) {
  const form = new FormData();
  form.append('file', file);
  return uploadFile(endpoint, '/upload/avatar', form);
}

export function downloadReport() {
  return downloadFile(endpoint, '/reports/monthly.xlsx', 'monthly.xlsx');
}
```

## Node

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

## Miniapp

```ts
import { createMiniappTransport } from '@yw/endpoint-plus/transports/miniapp';
import { downloadFile, uploadFile } from '@yw/endpoint-plus/miniapp';

endpoint.setTransport(createMiniappTransport({ runtime: wx }));

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

Keep `createMiniappTransport` imported from `@yw/endpoint-plus/transports/miniapp` to preserve transport boundary clarity. Use `@yw/endpoint-plus/miniapp` for runtime file helpers.
