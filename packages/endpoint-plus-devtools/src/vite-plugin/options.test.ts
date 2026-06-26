import { describe, expect, it } from 'vitest';
import { resolveOptions } from './options.ts';

describe('resolveOptions', () => {
  it('uses a package-specific default typegen file', () => {
    const options = resolveOptions({ enabled: true });

    expect(options.typegen.outputFile).toBe('src/types/endpoint-plus.generated.d.ts');
  });

  it('normalizes custom project-relative typegen files', () => {
    const options = resolveOptions({
      enabled: true,
      typegen: { outputFile: '.\\src\\contracts\\endpoint-plus.routes.d.ts' },
    });

    expect(options.typegen.outputFile).toBe('src/contracts/endpoint-plus.routes.d.ts');
  });

  it('rejects typegen files outside the project root', () => {
    expect(() =>
      resolveOptions({
        enabled: true,
        typegen: { outputFile: 'src/../../endpoint-plus.routes.d.ts' },
      }),
    ).toThrow(/outputFile must be a project-root-relative file path/);
  });
});
