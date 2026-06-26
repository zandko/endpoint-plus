import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import type { ViteDevServer } from 'vite';
import { debounce, orderBy } from 'es-toolkit';
import { DEVTOOLS_ROUTE_MANIFEST } from '../constants/index.ts';
import type { DevtoolsRouteManifest, DevtoolsRouteManifestEntry } from '../types/index.ts';
import { scanSource } from './scan.ts';

export interface RouteRegistry {
  getManifest(): DevtoolsRouteManifest;
  scanFile(file: string): void;
  removeFile(file: string): void;
  scanProject(): void;
  broadcast(): void;
}

export function createRegistry(server: ViteDevServer): RouteRegistry {
  const routesByFile = new Map<string, DevtoolsRouteManifestEntry[]>();

  function getManifest(): DevtoolsRouteManifest {
    return {
      routes: orderBy(
        Array.from(routesByFile.values()).flat(),
        ['method', 'template', 'file', 'line', 'column'],
        ['asc', 'asc', 'asc', 'asc', 'asc'],
      ),
      updatedAt: Date.now(),
    };
  }

  function scanFile(file: string): void {
    if (!existsSync(file)) {
      routesByFile.delete(file);
      return;
    }

    const source = readFileSync(file, 'utf8');
    const routes = scanSource(source, normalizeProjectFile(file, server.config.root));
    if (routes.length) {
      routesByFile.set(file, routes);
      return;
    }

    routesByFile.delete(file);
  }

  function removeFile(file: string): void {
    routesByFile.delete(file);
  }

  function scanProject(): void {
    const sourceRoot = path.resolve(server.config.root, 'src');
    const files = fg.sync(`${sourceRoot}/**/*.{ts,tsx,js,jsx,vue}`, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/.nuxt/**', '**/.output/**'],
      onlyFiles: true,
    });
    for (const file of files) {
      scanFile(file);
    }
  }

  const broadcast = debounce(() => {
    server.ws.send(DEVTOOLS_ROUTE_MANIFEST, getManifest());
  }, 100);

  return {
    getManifest,
    scanFile,
    removeFile,
    scanProject,
    broadcast,
  };
}

function normalizeProjectFile(file: string, root: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}
