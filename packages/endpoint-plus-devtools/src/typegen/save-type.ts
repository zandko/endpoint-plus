import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { escapeRegExp } from 'es-toolkit';
import { DEFAULT_TYPEGEN_OUTPUT_FILE } from '../constants/index.ts';
import { normalizeProjectRelativeFile } from '../utils/node.ts';
import type { DevtoolsTypegenSaveRequest, DevtoolsTypegenSaveResult } from '../types/index.ts';
import { generateTypes } from './generate-types.ts';

interface SaveTypeOptions {
  outputFile?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function saveType(
  root: string,
  request: DevtoolsTypegenSaveRequest,
  options: SaveTypeOptions = {},
): Promise<DevtoolsTypegenSaveResult> {
  const relativeFile = normalizeProjectRelativeFile(
    options.outputFile ?? DEFAULT_TYPEGEN_OUTPUT_FILE,
  );
  const file = path.resolve(root, relativeFile);
  mkdirSync(path.dirname(file), { recursive: true });

  const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const existed = Boolean(existing);
  const hadRoute = hasGeneratedRoute(existing, request.routeKey);

  if (hadRoute && !request.overwrite) {
    return {
      routeKey: request.routeKey,
      file,
      relativeFile,
      action: 'updated',
      ok: false,
      requiresConfirmation: true,
      message: `${request.routeKey} already exists. Confirm overwrite to update its generated type.`,
    };
  }

  // Generate declarations via the shared quicktype pipeline.
  const { declarations, rootTypeName } =
    request.responseSample !== undefined
      ? await generateTypes(root, {
          typeName: request.responseTypeName,
          sample: request.responseSample,
        })
      : {
          declarations: `interface ${request.responseTypeName} {\n    [key: string]: unknown;\n}`,
          rootTypeName: request.responseTypeName,
        };

  // Upsert route block → rebuild declare module.
  let content = upsertRouteBlock(existing, request.routeKey, declarations);
  const entries = extractRouteEntries(content);
  content = upsertRoutesDeclaration(content, buildRoutesDeclaration(entries));

  if (
    !content.includes("import 'endpoint-plus';") &&
    !content.includes('import "endpoint-plus";')
  ) {
    content = `import 'endpoint-plus';\n\n${content}`;
  }

  writeFileSync(file, content);

  return {
    routeKey: request.routeKey,
    file,
    relativeFile,
    action: !existed ? 'created' : hadRoute ? 'updated' : 'added',
    ok: true,
    message: `Saved ${rootTypeName}`,
  };
}

// ---------------------------------------------------------------------------
// Route block helpers
// ---------------------------------------------------------------------------

const ROUTES_DECL_START = '// <endpoint-plus:routes>';
const ROUTES_DECL_END = '// </endpoint-plus:routes>';
const ROUTES_DECL_PATTERN = new RegExp(
  `${escapeRegExp(ROUTES_DECL_START)}[\\s\\S]*?${escapeRegExp(ROUTES_DECL_END)}`,
);

/**
 * Insert or replace the declaration block for one route.
 *
 *   // <endpoint-plus route="METHOD /path">
 *   interface Foo { ... }
 *   type Bar = Foo[];
 *   // </endpoint-plus>
 */
function upsertRouteBlock(source: string, routeKey: string, declarations: string): string {
  const block = [
    `// <endpoint-plus route="${routeKey}">`,
    declarations,
    `// </endpoint-plus>`,
  ].join('\n');

  const pattern = new RegExp(
    `// <endpoint-plus route="${escapeRegExp(routeKey)}">[\\s\\S]*?// </endpoint-plus>`,
  );

  const sourceWithoutRoutes = source.replace(ROUTES_DECL_PATTERN, '').trimEnd();

  if (pattern.test(sourceWithoutRoutes)) {
    return `${sourceWithoutRoutes.replace(pattern, block).trimEnd()}\n`;
  }

  return `${sourceWithoutRoutes ? `${sourceWithoutRoutes}\n\n` : ''}${block}\n`;
}

// ---------------------------------------------------------------------------
// declare module block
// ---------------------------------------------------------------------------

interface RouteEntry {
  routeKey: string;
  /** Root type name for `declare module` — the alias for arrays, interface for objects. */
  rootTypeName: string;
}

/**
 * Extract route entries from the file.
 *
 * Priority:
 *   1. `type X = Y[]` lines   → X is the root (array case)
 *   2. First `interface X {`  → X is the root (object case)
 */
function extractRouteEntries(source: string): RouteEntry[] {
  const blockRe = /\/\/ <endpoint-plus route="([^"]+)">\n([\s\S]*?)\/\/ <\/endpoint-plus>/g;
  const entries: RouteEntry[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(source)) !== null) {
    const routeKey = match[1]!;
    const body = match[2]!;

    const typeAliasMatch = /^type\s+(\w+)\s*=/m.exec(body);
    if (typeAliasMatch) {
      entries.push({ routeKey, rootTypeName: typeAliasMatch[1]! });
      continue;
    }

    const interfaceMatch = /^interface\s+(\w+)\s*\{/m.exec(body);
    if (interfaceMatch) {
      entries.push({ routeKey, rootTypeName: interfaceMatch[1]! });
    }
  }

  return entries;
}

function buildRoutesDeclaration(entries: RouteEntry[]): string {
  const routeLines = entries
    .toSorted((a, b) => a.routeKey.localeCompare(b.routeKey))
    .map((e) => `      "${e.routeKey}": { response: ${e.rootTypeName} };`)
    .join('\n');

  return [
    ROUTES_DECL_START,
    'declare module "endpoint-plus" {',
    '  namespace YwEndpoint {',
    '    interface Routes {',
    routeLines,
    '    }',
    '  }',
    '}',
    ROUTES_DECL_END,
  ].join('\n');
}

function upsertRoutesDeclaration(source: string, block: string): string {
  const stripped = source.replace(ROUTES_DECL_PATTERN, '').trimEnd();
  return `${stripped}\n\n${block}\n`;
}

function hasGeneratedRoute(source: string, routeKey: string): boolean {
  return source.includes(`// <endpoint-plus route="${routeKey}">`);
}
