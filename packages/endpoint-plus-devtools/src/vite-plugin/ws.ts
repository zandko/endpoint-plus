import launchEditor from 'launch-editor';
import type { ViteDevServer } from 'vite';
import type { DevtoolsTypegenPreviewRequest, DevtoolsTypegenSaveRequest } from '../types/index.ts';
import {
  DEVTOOLS_CONFIG,
  DEVTOOLS_PANEL_READY,
  DEVTOOLS_ROUTE_MANIFEST,
  DEVTOOLS_TYPEGEN_OPEN,
  DEVTOOLS_TYPEGEN_PREVIEW,
  DEVTOOLS_TYPEGEN_PREVIEW_RESULT,
  DEVTOOLS_TYPEGEN_SAVE,
  DEVTOOLS_TYPEGEN_SAVED,
} from '../constants/index.ts';
import { generateTypes } from '../typegen/generate-types.ts';
import { saveType } from '../typegen/save-type.ts';
import type { RouteRegistry } from '../scanner/registry.ts';

interface WebSocketRelayOptions {
  typegenOutputFile: string;
}

export function installWebSocketRelay(
  server: ViteDevServer,
  routeRegistry: RouteRegistry,
  options: WebSocketRelayOptions,
): void {
  server.ws.on(DEVTOOLS_PANEL_READY, () => {
    server.ws.send(DEVTOOLS_CONFIG, {
      typegen: { outputFile: options.typegenOutputFile },
    });
    server.ws.send(DEVTOOLS_ROUTE_MANIFEST, routeRegistry.getManifest());
  });

  // ── Preview (dry-run: generate types without writing) ────────────────────
  server.ws.on(DEVTOOLS_TYPEGEN_PREVIEW, (req) => {
    const { responseTypeName, responseSample } = req as DevtoolsTypegenPreviewRequest;

    generateTypes(server.config.root, {
      typeName: responseTypeName,
      sample: responseSample,
    })
      .then(({ declarations, rootTypeName }) => {
        server.ws.send(DEVTOOLS_TYPEGEN_PREVIEW_RESULT, {
          responseTypeName,
          declarations,
          rootTypeName,
        });
      })
      .catch((error: unknown) => {
        console.error('[endpoint-plus:typegen] Preview failed:', error);
        server.ws.send(DEVTOOLS_TYPEGEN_PREVIEW_RESULT, {
          responseTypeName,
          declarations: '',
          rootTypeName: responseTypeName,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });

  // ── Save (write declarations to disk) ────────────────────────────────────
  server.ws.on(DEVTOOLS_TYPEGEN_SAVE, (request) => {
    saveType(server.config.root, request as DevtoolsTypegenSaveRequest, {
      outputFile: options.typegenOutputFile,
    })
      .then((result) => {
        server.ws.send(DEVTOOLS_TYPEGEN_SAVED, result);
      })
      .catch((error: unknown) => {
        console.error('[endpoint-plus:typegen] Save failed:', error);
      });
  });

  // ── Open file in editor ──────────────────────────────────────────────────
  server.ws.on(DEVTOOLS_TYPEGEN_OPEN, (file) => {
    if (typeof file === 'string' && file.length > 0) {
      launchEditor(file);
    }
  });
}
