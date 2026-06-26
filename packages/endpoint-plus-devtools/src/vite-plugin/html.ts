import { existsSync, readFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import mime from 'mime-types';
import { parseURL } from 'ufo';

export function createHtml(distRoot: string, base: string): string {
  const htmlPath = path.resolve(distRoot, 'index.html');
  if (!existsSync(htmlPath)) {
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head><meta charset="UTF-8" /><title>endpoint-plus devtools</title></head>',
      '<body style="margin:0;background:#101410;color:#e5eadf;font:14px system-ui;padding:24px">',
      '<h1>endpoint-plus devtools is not built</h1>',
      '<p>Run <code>corepack pnpm -C packages/endpoint-plus-devtools build</code> and restart Vite.</p>',
      '</body>',
      '</html>',
    ].join('');
  }

  return readFileSync(htmlPath, 'utf8')
    .replaceAll('"/assets/', `"${base}assets/`)
    .replaceAll("'/assets/", `'${base}assets/`);
}

export function serveAsset(
  url: string,
  base: string,
  distRoot: string,
  response: ServerResponse,
): void {
  const { pathname } = parseURL(url);
  const relative = decodeURIComponent(
    pathname.startsWith(base) ? pathname.slice(base.length) : pathname,
  );
  const filePath = path.resolve(distRoot, relative);

  if (!filePath.startsWith(distRoot) || !existsSync(filePath)) {
    response.statusCode = 404;
    response.end();
    return;
  }

  response.setHeader('Content-Type', mime.lookup(filePath) || 'application/octet-stream');
  response.end(readFileSync(filePath));
}
