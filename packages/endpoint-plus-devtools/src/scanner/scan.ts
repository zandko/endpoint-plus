import { pascalCase } from 'es-toolkit';
import { parse as parseSfc } from '@vue/compiler-sfc';
import ts from 'typescript';
import { parseURL, withoutTrailingSlash } from 'ufo';
import type { DevtoolsRouteManifestEntry } from '../types/index.ts';
import { pluralize } from '../utils/index.ts';

const REQUEST_METHODS = new Set(['get', 'delete', 'post', 'put', 'patch']);
const HTTP_METHODS = new Set(['GET', 'DELETE', 'POST', 'PUT', 'PATCH', 'HEAD', 'OPTIONS']);

export function scanSource(source: string, file: string): DevtoolsRouteManifestEntry[] {
  const script = file.endsWith('.vue') ? extractVueScript(source, file) : source;
  if (!script.trim()) {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    file,
    script,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file),
  );
  const routes: DevtoolsRouteManifestEntry[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const route = extractRouteFromCall(node, sourceFile, file);
      if (route) {
        routes.push(route);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routes;
}

function extractVueScript(source: string, file: string): string {
  const parsed = parseSfc(source, { filename: file });
  return [
    parsed.descriptor.script?.content ?? '',
    parsed.descriptor.scriptSetup?.content ?? '',
  ].join('\n');
}

function scriptKind(file: string): ts.ScriptKind {
  if (file.endsWith('.tsx')) {
    return ts.ScriptKind.TSX;
  }
  if (file.endsWith('.jsx')) {
    return ts.ScriptKind.JSX;
  }
  return ts.ScriptKind.TS;
}

function extractRouteFromCall(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  file: string,
): DevtoolsRouteManifestEntry | null {
  const methodCall = extractMethodCall(node);
  if (methodCall) {
    const url = expressionToRouteTemplate(node.arguments[0]);
    if (!url) {
      return null;
    }

    return createManifestEntry(methodCall.method, url, node, sourceFile, file);
  }

  if (!isRequestCall(node)) {
    return null;
  }

  const config = node.arguments[0];
  if (!config || !ts.isObjectLiteralExpression(config)) {
    return null;
  }

  const method = getStringProperty(config, 'method')?.toUpperCase();
  const urlExpression = getPropertyExpression(config, 'url');
  const url = urlExpression ? expressionToRouteTemplate(urlExpression) : null;
  if (!method || !HTTP_METHODS.has(method) || !url) {
    return null;
  }

  return createManifestEntry(method, url, node, sourceFile, file);
}

function extractMethodCall(node: ts.CallExpression): { method: string } | null {
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee)) {
    return null;
  }

  const method = callee.name.text.toLowerCase();
  if (!REQUEST_METHODS.has(method)) {
    return null;
  }

  return { method: method.toUpperCase() };
}

function isRequestCall(node: ts.CallExpression): boolean {
  const callee = node.expression;
  return ts.isPropertyAccessExpression(callee) && callee.name.text === 'request';
}

function expressionToRouteTemplate(expression: ts.Expression | undefined): string | null {
  if (!expression) {
    return null;
  }

  if (ts.isStringLiteralLike(expression)) {
    return normalizeTemplatePath(expression.text);
  }

  if (ts.isNoSubstitutionTemplateLiteral(expression)) {
    return normalizeTemplatePath(expression.text);
  }

  if (ts.isTemplateExpression(expression)) {
    return normalizeTemplatePath(templateExpressionToRoute(expression));
  }

  return null;
}

function templateExpressionToRoute(expression: ts.TemplateExpression): string {
  let value = expression.head.text;
  for (const span of expression.templateSpans) {
    value += `:${inferParamName(span.expression, value)}`;
    value += span.literal.text;
  }
  return value;
}

function inferParamName(expression: ts.Expression, routePrefix: string): string {
  const name = expressionName(expression);
  if (name && name !== 'id' && name !== 'param') {
    return name;
  }

  const segment = previousStaticSegment(routePrefix);
  if (segment) {
    return `${pluralize.singular(segment)}Id`;
  }

  return name ?? 'param';
}

function expressionName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }

  return null;
}

function previousStaticSegment(routePrefix: string): string | null {
  const segments = routePrefix.split('/').filter(Boolean);
  return segments.at(-1) ?? null;
}

function normalizeTemplatePath(path: string): string {
  return withoutTrailingSlash(parseURL(path).pathname || '/') || '/';
}

function getStringProperty(object: ts.ObjectLiteralExpression, name: string): string | null {
  const expression = getPropertyExpression(object, name);
  if (!expression || !ts.isStringLiteralLike(expression)) {
    return null;
  }
  return expression.text;
}

function getPropertyExpression(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | null {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    const propertyName = property.name;
    if (
      (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName)) &&
      propertyName.text === name
    ) {
      return property.initializer;
    }
  }

  return null;
}

function createManifestEntry(
  method: string,
  template: string,
  node: ts.Node,
  sourceFile: ts.SourceFile,
  file: string,
): DevtoolsRouteManifestEntry {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const id = `${method} ${template}`;

  return {
    id,
    method,
    template,
    responseTypeName: toResponseTypeName(method, template),
    file,
    line: position.line + 1,
    column: position.character + 1,
  };
}

function toResponseTypeName(method: string, template: string): string {
  const parts = template
    .replace(/^\/api(?:\/v\d+)?\//, '/')
    .split('/')
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith(':')) {
        return `By${toPascalCase(part.slice(1))}`;
      }
      return toPascalCase(part);
    });

  return `${toPascalCase(method)}${parts.join('')}Response`;
}

function toPascalCase(value: string): string {
  if (value === value.toUpperCase() && /^[A-Z]+$/.test(value)) {
    return value;
  }
  return pascalCase(value).replace(/Id\b/g, 'ID');
}
