import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin as VitePlugin } from 'vite';
import { createRegistry } from '../scanner/registry.ts';
import { createMiddleware } from './middleware.ts';
import { installWebSocketRelay } from './ws.ts';
import { type EndpointPlusDevtoolsViteOptions, resolveOptions } from './options.ts';

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(sourceRoot, '..', '..');
const distRoot = path.resolve(packageRoot, 'dist');

export default function endpointPlusDevtools(
  options: EndpointPlusDevtoolsViteOptions = {},
): VitePlugin {
  const { enabled, base, typegen } = resolveOptions(options);

  return {
    name: 'yw:endpoint-plus-devtools',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      if (!enabled) {
        return;
      }

      const routeRegistry = createRegistry(server);
      routeRegistry.scanProject();
      installWebSocketRelay(server, routeRegistry, {
        typegenOutputFile: typegen.outputFile,
      });
      // Prevent the generated .d.ts from triggering HMR reloads / page refreshes.
      // We write the file ourselves in the WS relay; watching it would cause the host
      // page to reload and destroy the devtools iframe.
      const typegenAbsFile = path.resolve(server.config.root, typegen.outputFile);
      server.watcher.unwatch(typegenAbsFile);
      // Also unwatch when Vite adds it for the first time
      server.watcher.on('add', (file) => {
        if (file === typegenAbsFile) {
          server.watcher.unwatch(file);
          return;
        }
        routeRegistry.scanFile(file);
        routeRegistry.broadcast();
      });
      server.watcher.on('change', (file) => {
        if (file === typegenAbsFile) return; // silently ignore
        routeRegistry.scanFile(file);
        routeRegistry.broadcast();
      });
      server.watcher.on('unlink', (file) => {
        routeRegistry.removeFile(file);
        routeRegistry.broadcast();
      });
      server.middlewares.use(createMiddleware(base, distRoot));
    },
    transformIndexHtml() {
      if (!enabled) {
        return [];
      }

      const runtime = normalizeFsPath(path.resolve(packageRoot, 'src/runtime.ts'));
      return [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: [
            `import { installClient } from '/@fs/${runtime}';`,
            `installClient(${JSON.stringify({
              base,
              typegen: { outputFile: typegen.outputFile },
            })});`,
          ].join('\n'),
        },
      ];
    },
  };
}

export { endpointPlusDevtools };
export type { EndpointPlusDevtoolsViteOptions };

function normalizeFsPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
