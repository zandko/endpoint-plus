/**
 * generate-types.ts
 *
 * Single source of truth for all TypeScript type generation.
 * Powers both the live preview (via WS round-trip) and the file save.
 *
 * quicktype-core capabilities used:
 *   · `just-types`       — emit only type declarations, no runtime converters
 *   · `acronym-style`    — preserve casing of acronyms (ID, URL, etc.)
 *   · Array awareness    — detect root arrays, emit `type Root = ItemType[]`
 *                          by passing the full array to quicktype with the item
 *                          name; quicktype infers from ALL elements for better
 *                          optional / union coverage
 */

import path from 'node:path';
import { createRequire } from 'node:module';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface GenerateTypesInput {
  /** The desired root TypeScript type name, e.g. `GETUsersResponse`. */
  typeName: string;
  /**
   * The raw JSON response value.  Arrays are unwrapped automatically:
   *   · Array  → quicktype runs on the array to infer the element type, then
   *              `type ${typeName} = ${typeName}Item[]` is prepended.
   *   · Object → quicktype generates `interface ${typeName} { … }` directly.
   *   · Scalar → `type ${typeName} = string | number | boolean | null`.
   */
  sample: unknown;
}

export interface GenerateTypesOutput {
  /**
   * The full declarations block verbatim — ready to embed in a `.d.ts` file.
   * May contain multiple `interface` / `type` statements.
   *
   * Example (array):
   *   interface GETUsersResponseItem { id: number; name: string; }
   *   type GETUsersResponse = GETUsersResponseItem[];
   *
   * Example (object):
   *   interface GETUserResponse { id: number; profile: GETUserResponseProfile; }
   *   interface GETUserResponseProfile { bio: string; }
   */
  declarations: string;
  /**
   * The single root type name to reference in `declare module`.
   * For arrays this is the alias name (`GETUsersResponse`), not the item name.
   */
  rootTypeName: string;
}

// ---------------------------------------------------------------------------
// Renderer options
// ---------------------------------------------------------------------------

/**
 * quicktype TypeScript renderer options used throughout this project.
 * Centralised here so preview and save are always in sync.
 */
const QUICKTYPE_RENDERER_OPTIONS: Record<string, string> = {
  /** No runtime converters — we only want the type declarations. */
  'just-types': 'true',
  /**
   * Preserve acronym casing from the JSON keys.
   * `userID` stays `userID`, not `UserId`.
   * `apiURL` stays `apiURL`.
   */
  'acronym-style': 'original',
};

// ---------------------------------------------------------------------------
// quicktype loader (cached per process)
// ---------------------------------------------------------------------------

interface QuicktypeJsonInput {
  addSource(source: { name: string; samples: string[] }): Promise<void>;
}

interface QuicktypeInputData {
  addInput(input: unknown): void;
}

interface QuicktypeCore {
  jsonInputForTargetLanguage(lang: string): QuicktypeJsonInput;
  InputData: new () => QuicktypeInputData;
  quicktype(options: {
    inputData: QuicktypeInputData;
    lang: string;
    rendererOptions?: Record<string, string>;
  }): Promise<{ lines: string[] }>;
}

let cachedQt: QuicktypeCore | undefined;

async function loadQuicktype(projectRoot: string): Promise<QuicktypeCore> {
  if (cachedQt) return cachedQt;

  const req = createRequire(path.resolve(projectRoot, 'package.json'));
  try {
    cachedQt = req('quicktype-core') as QuicktypeCore;
  } catch {
    // ESM fallback (some setups publish quicktype-core as ESM)
    const qtPath = req.resolve('quicktype-core');
    cachedQt = (await import(qtPath)) as QuicktypeCore;
  }
  return cachedQt!;
}

// ---------------------------------------------------------------------------
// Core generation logic
// ---------------------------------------------------------------------------

/**
 * Run quicktype on a single JSON sample string with the given type name.
 * Returns cleaned lines (no `export` keyword, trimmed).
 */
async function runQuicktype(qt: QuicktypeCore, typeName: string, json: string): Promise<string> {
  const jsonInput = qt.jsonInputForTargetLanguage('typescript');
  await jsonInput.addSource({ name: typeName, samples: [json] });

  const inputData = new qt.InputData();
  inputData.addInput(jsonInput);

  const result = await qt.quicktype({
    inputData,
    lang: 'typescript',
    rendererOptions: QUICKTYPE_RENDERER_OPTIONS,
  });

  // quicktype emits `export interface` / `export type` — strip the export for
  // ambient .d.ts usage where declarations are implicitly ambient.
  return result.lines
    .join('\n')
    .replace(/^export (interface|type|enum)/gm, '$1')
    .trim();
}

/**
 * Generate TypeScript type declarations for a given JSON response sample.
 *
 * Arrays:
 *   quicktype is invoked with the **full array** as the JSON input and the
 *   *item* name (`${typeName}Item`) as the source name.  This lets quicktype
 *   analyse all array elements for better optional/union field inference.
 *   We then wrap with `type ${typeName} = ${typeName}Item[];`.
 *
 * Objects:
 *   quicktype is invoked directly with the object and `typeName`.  Nested
 *   objects automatically get generated helper interfaces.
 *
 * Scalars / null:
 *   A simple `type ${typeName} = <primitive>;` is returned.
 */
export async function generateTypes(
  projectRoot: string,
  input: GenerateTypesInput,
): Promise<GenerateTypesOutput> {
  const { typeName, sample } = input;

  // ── Scalar / null (not an object or array) ────────────────────────────────
  if (sample === null || (typeof sample !== 'object' && !Array.isArray(sample))) {
    const primitiveType = sample === null ? 'null' : typeof sample;
    return {
      declarations: `type ${typeName} = ${primitiveType};`,
      rootTypeName: typeName,
    };
  }

  const qt = await loadQuicktype(projectRoot);

  // ── Array ─────────────────────────────────────────────────────────────────
  if (Array.isArray(sample)) {
    if (sample.length === 0) {
      return {
        declarations: `type ${typeName} = unknown[];`,
        rootTypeName: typeName,
      };
    }

    const itemTypeName = `${typeName}Item`;

    // Pass the FULL array to quicktype so it can analyse all elements and
    // produce better optional / union types for fields that vary across items.
    const itemDeclarations = await runQuicktype(qt, itemTypeName, JSON.stringify(sample));

    // The type alias (root) goes AFTER the interfaces it references.
    const declarations = `${itemDeclarations}\ntype ${typeName} = ${itemTypeName}[];`;

    return { declarations, rootTypeName: typeName };
  }

  // ── Object ────────────────────────────────────────────────────────────────
  const declarations = await runQuicktype(qt, typeName, JSON.stringify(sample));
  return { declarations, rootTypeName: typeName };
}
