import { pascalCase } from 'es-toolkit';
import type { EndpointTransportResponse } from '../../types';

const DEFAULT_TYPE_NAME = 'EndpointResponse';
const RESPONSE_SUFFIX = 'Response';
const PARAM_PREFIX = 'By';
const INFRASTRUCTURE_PREFIXES = new Set(['api']);

export function inferTypeName(response: EndpointTransportResponse): string {
  const method = toTypeNamePart(String(response.config.method || 'response'));
  const routeName = inferRouteName(response.config.url || 'response');
  const name = `${method}${routeName}${RESPONSE_SUFFIX}`;

  return name === RESPONSE_SUFFIX ? DEFAULT_TYPE_NAME : name;
}

function inferRouteName(url: string): string {
  const segments = normalizeRouteSegments(url);
  if (segments.length === 0) {
    return '';
  }

  return segments.map(formatRouteSegment).join('');
}

function normalizeRouteSegments(url: string): string[] {
  const pathname = resolvePathname(url);
  const segments = pathname.split('/').filter(Boolean);
  return stripInfrastructurePrefixes(segments);
}

function resolvePathname(url: string): string {
  const cleanUrl = url.replace(/[?#].*$/, '');

  try {
    return new URL(cleanUrl).pathname;
  } catch {
    return cleanUrl;
  }
}

function stripInfrastructurePrefixes(segments: string[]): string[] {
  let index = 0;

  while (index < segments.length && isInfrastructurePrefix(segments[index]!)) {
    index += 1;
  }

  return segments.slice(index);
}

function isInfrastructurePrefix(segment: string): boolean {
  const normalized = segment.toLowerCase();
  return INFRASTRUCTURE_PREFIXES.has(normalized) || /^v\d+(?:\.\d+)?$/.test(normalized);
}

function formatRouteSegment(segment: string): string {
  const parameterName = extractParameterName(segment);
  if (parameterName) {
    return `${PARAM_PREFIX}${toTypeNamePart(parameterName)}`;
  }

  if (isRuntimeIdentifier(segment)) {
    return `${PARAM_PREFIX}ID`;
  }

  return toTypeNamePart(decodeRouteSegment(segment));
}

function extractParameterName(segment: string): string | undefined {
  const decoded = decodeRouteSegment(segment);
  const colonMatch = decoded.match(/^:([A-Za-z0-9_]+)$/);
  if (colonMatch) {
    return colonMatch[1];
  }

  const bracesMatch = decoded.match(/^\{([^}]+)\}$/);
  if (bracesMatch?.[1]) {
    return normalizeParameterName(bracesMatch[1]);
  }

  const bracketsMatch = decoded.match(/^\[{1,2}(\.\.\.)?([^\]]+)\]{1,2}$/);
  if (bracketsMatch?.[2]) {
    return normalizeParameterName(bracketsMatch[2]);
  }

  return undefined;
}

function normalizeParameterName(name: string): string | undefined {
  return name.replace(/^\.\.\./, '').trim() || undefined;
}

function isRuntimeIdentifier(segment: string): boolean {
  return /^\d+$/.test(segment) || isUuid(segment);
}

function isUuid(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment);
}

function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function toTypeNamePart(value: string): string {
  return pascalCase(value).replace(/Id\b/g, 'ID');
}
