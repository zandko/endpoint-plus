import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { saveType } from './save-type.ts';

describe('saveType', () => {
  it('creates then updates one route block without duplicating it', async () => {
    const root = mkdtempSync(join(tmpdir(), 'endpoint-plus-devtools-'));
    const routeKey = 'GET /api/users/:userId';

    const responseSample = { id: 1, name: 'Alice' };

    const created = await saveType(root, {
      routeKey,
      responseTypeName: 'GETUsersByUserIDResponse',
      responseSample,
    });
    expect(created.action).toBe('created');
    expect(created.ok).toBe(true);
    expect(created.relativeFile).toBe('src/types/endpoint-plus.generated.d.ts');

    const updated = await saveType(root, {
      routeKey,
      responseTypeName: 'GETUsersByUserIDResponse',
      responseSample: { id: 2, name: 'Bob', email: 'bob@example.com' },
    });
    expect(updated.requiresConfirmation).toBe(true);

    const overwritten = await saveType(root, {
      routeKey,
      responseTypeName: 'GETUsersByUserIDResponse',
      responseSample: { id: 2, name: 'Bob', email: 'bob@example.com' },
      overwrite: true,
    });
    expect(overwritten.action).toBe('updated');

    const file = readFileSync(created.file, 'utf8');

    // Exactly one interface block for this route key
    expect(file.match(/<endpoint-plus route=/g)).toHaveLength(1);

    // One unified declare module block at the end
    expect(file.match(/<endpoint-plus:routes>/g)).toHaveLength(1);
    expect(file).toContain('declare module "endpoint-plus"');
    expect(file).toContain('GETUsersByUserIDResponse');

    // No `export interface` — ambient .d.ts style
    expect(file).not.toMatch(/^export interface/m);

    // The declare module block must reference the route
    expect(file).toContain(`"${routeKey}": { response: GETUsersByUserIDResponse };`);
  });

  it('adds a second route and both appear in the shared declare module block', async () => {
    const root = mkdtempSync(join(tmpdir(), 'endpoint-plus-devtools-'));

    await saveType(root, {
      routeKey: 'GET /api/users',
      responseTypeName: 'GETUsersResponse',
      responseSample: [{ id: 1 }],
    });

    await saveType(root, {
      routeKey: 'POST /api/users',
      responseTypeName: 'POSTUsersResponse',
      responseSample: { id: 2 },
    });

    const file = readFileSync(
      (
        await saveType(root, {
          routeKey: 'GET /api/users',
          responseTypeName: 'GETUsersResponse',
          responseSample: [{ id: 99 }],
        })
      ).file,
      'utf8',
    );

    // Two interface blocks
    expect(file.match(/<endpoint-plus route=/g)).toHaveLength(2);

    // One shared declare module block with both routes
    expect(file.match(/<endpoint-plus:routes>/g)).toHaveLength(1);
    expect(file).toContain('"GET /api/users": { response: GETUsersResponse };');
    expect(file).toContain('"POST /api/users": { response: POSTUsersResponse };');
  });

  it('writes to a custom project-relative output file', async () => {
    const root = mkdtempSync(join(tmpdir(), 'endpoint-plus-devtools-'));

    const result = await saveType(
      root,
      {
        routeKey: 'GET /api/users',
        responseTypeName: 'GETUsersResponse',
        responseSample: [{ id: 1 }],
      },
      { outputFile: 'src/types/endpoint-plus.contracts.d.ts' },
    );

    expect(result.relativeFile).toBe('src/types/endpoint-plus.contracts.d.ts');
    expect(existsSync(join(root, 'src/types/endpoint-plus.contracts.d.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/types/endpoint-plus.generated.d.ts'))).toBe(false);
  });

  it('rejects output files outside the project root', async () => {
    const root = mkdtempSync(join(tmpdir(), 'endpoint-plus-devtools-'));

    await expect(
      saveType(
        root,
        {
          routeKey: 'GET /api/users',
          responseTypeName: 'GETUsersResponse',
          responseSample: [{ id: 1 }],
        },
        { outputFile: 'src/../../outside.d.ts' },
      ),
    ).rejects.toThrow(/project-root-relative/);
  });
});
