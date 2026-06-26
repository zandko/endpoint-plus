import type { Connect } from 'vite';
import { parseURL, withTrailingSlash, joinURL } from 'ufo';
import { createHtml, serveAsset } from './html.ts';

export function createMiddleware(base: string, distRoot: string): Connect.NextHandleFunction {
  const normalizedBase = withTrailingSlash(base);
  const assetsPrefix = joinURL(normalizedBase, 'assets/');

  return (request, response, next) => {
    if (!request.url) {
      next();
      return;
    }

    const { pathname } = parseURL(request.url);
    if (!pathname) {
      next();
      return;
    }

    if (pathname.startsWith(assetsPrefix)) {
      serveAsset(request.url, normalizedBase, distRoot, response);
      return;
    }

    if (withTrailingSlash(pathname) === normalizedBase) {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(createHtml(distRoot, normalizedBase));
      return;
    }

    next();
  };
}
