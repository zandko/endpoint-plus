import type { TypegenMeta, TypegenOutputHandler, TypegenOutputTarget } from './types';

export async function emitTypegenOutput(
  code: string,
  meta: TypegenMeta,
  output: TypegenOutputTarget | TypegenOutputHandler | undefined,
): Promise<void> {
  if (typeof output === 'function') {
    await output(code, meta);
    return;
  }

  const target = output ?? 'auto';
  if (target === 'browser' || (target === 'auto' && isBrowserConsole())) {
    printBrowserOutput(code, meta);
    return;
  }

  printConsoleOutput(code, meta);
}

function printBrowserOutput(code: string, meta: TypegenMeta): void {
  const label = formatLabel(meta);
  if (typeof console.groupCollapsed === 'function' && typeof console.groupEnd === 'function') {
    console.groupCollapsed(label);
    console.log(code);
    console.groupEnd();
    return;
  }

  printConsoleOutput(code, meta);
}

function printConsoleOutput(code: string, meta: TypegenMeta): void {
  console.log(`${formatLabel(meta)}\n${code}`);
}

function formatLabel(meta: TypegenMeta): string {
  return `[endpoint-plus:typegen] ${meta.method} ${meta.url ?? ''} -> ${meta.name}`.trim();
}

function isBrowserConsole(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
