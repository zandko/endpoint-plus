import type { DevtoolsRouteRecord } from '../types/index.ts';

const METHOD_CLASS_MAP: Record<string, string> = {
  GET: 'method-get',
  POST: 'method-post',
  PUT: 'method-put',
  PATCH: 'method-patch',
  DELETE: 'method-delete',
};

export function methodClass(method: string): string {
  return METHOD_CLASS_MAP[method.toUpperCase()] ?? 'method-other';
}

export function locationLabel(route: Pick<DevtoolsRouteRecord, 'file' | 'line'>): string {
  if (!route.file) return '';
  const parts = route.file.split('/');
  const short = parts.length > 4 ? `.../${parts.slice(-4).join('/')}` : route.file;
  return route.line ? `${short}:${route.line}` : short;
}
