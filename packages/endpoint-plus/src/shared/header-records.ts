export type HeaderRecord = Record<string, string>;

export function normalizeHeaderRecord(headers: Record<string, unknown> | undefined): HeaderRecord {
  if (!headers) {
    return {};
  }

  const normalizedHeaders: HeaderRecord = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value !== null && value !== undefined) {
      normalizedHeaders[key] = String(value);
    }
  }

  return normalizedHeaders;
}

export function mergeHeaderRecords(
  base?: Record<string, unknown>,
  override?: Record<string, unknown>,
): HeaderRecord {
  const headers = normalizeHeaderRecord(base);

  for (const [key, value] of Object.entries(normalizeHeaderRecord(override))) {
    const existingKey = findHeaderKey(headers, key);

    if (existingKey) {
      delete headers[existingKey];
    }

    headers[key] = value;
  }

  return headers;
}

export function getHeader(headers: Record<string, unknown>, name: string): string | undefined {
  const key = findHeaderKey(headers, name);
  const value = key ? headers[key] : undefined;

  return value !== null && value !== undefined ? String(value) : undefined;
}

export function removeHeader(headers: HeaderRecord, name: string): HeaderRecord {
  const nextHeaders = { ...headers };
  const key = findHeaderKey(nextHeaders, name);

  if (key) {
    delete nextHeaders[key];
  }

  return nextHeaders;
}

function findHeaderKey(headers: Record<string, unknown>, name: string): string | undefined {
  const normalizedName = name.toLowerCase();

  return Object.keys(headers).find((key) => key.toLowerCase() === normalizedName);
}
