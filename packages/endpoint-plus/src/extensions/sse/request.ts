import { isError, isNil, isPlainObject } from 'es-toolkit';
import { EndpointError } from '../../errors/endpoint-error';
import { getRuntimeFetch } from '../../transport/fetch/runtime';
import type {
  EndpointRequestConfig,
  EndpointTransportResponse,
  FetchLike,
  InternalEndpointRequestConfig,
} from '../../types';
import type { EndpointSseConfig } from './types';
import { mergeHeaders } from '../../shared/request-config';
import { serializeRequestBody } from '../../shared/payload-codec';
import { buildRequestUrl } from '../../shared/request-url';

export interface EndpointSseConfigPreparer {
  prepareRequestConfig<TBody = unknown>(
    config: EndpointRequestConfig<TBody, Response>,
  ): Promise<InternalEndpointRequestConfig<TBody>>;
}

export interface PrepareSseConfigOptions<TData, TBody> {
  client: EndpointSseConfigPreparer;
  config: EndpointSseConfig<TData, TBody>;
  url: string;
}

export async function prepareSseConfig<TData, TBody>(
  options: PrepareSseConfigOptions<TData, TBody>,
): Promise<InternalEndpointRequestConfig<TBody>> {
  return options.client.prepareRequestConfig({
    ...options.config,
    headers: mergeHeaders({ Accept: 'text/event-stream' }, options.config.headers),
    method: options.config.method ?? 'GET',
    url: options.url,
  });
}

export async function sendSseRequest(
  config: InternalEndpointRequestConfig,
  fetchInput: FetchLike | undefined,
): Promise<Response> {
  const fetchClient = fetchInput ?? getRuntimeFetch();
  const response = await fetchClient(buildRequestUrl(config), {
    body: resolveSseBody(config),
    headers: config.headers,
    method: config.method,
    signal: config.signal,
  });

  if (!response.ok) {
    throw await createSseResponseError(response, config);
  }

  if (!response.body) {
    throw new EndpointError('SSE response body is not readable.', {
      config,
      response: toEndpointResponse(response, config),
    });
  }

  return response;
}

export function normalizeSseError(
  error: unknown,
  config: InternalEndpointRequestConfig,
): EndpointError {
  if (error instanceof EndpointError) {
    return error;
  }

  return new EndpointError(isError(error) ? error.message : String(error), {
    config,
    cause: error,
  });
}

function resolveSseBody(config: InternalEndpointRequestConfig): BodyInit | undefined {
  if (config.method === 'GET' || config.method === 'HEAD') {
    return undefined;
  }

  const body = serializeRequestBody(config);

  if (isNil(body)) {
    return undefined;
  }

  if (isPlainObject(body) || Array.isArray(body)) {
    return JSON.stringify(body);
  }

  return body as BodyInit;
}

async function createSseResponseError(
  response: Response,
  config: InternalEndpointRequestConfig,
): Promise<EndpointError> {
  const data = await response.text().catch(() => undefined);

  return new EndpointError(`SSE request failed with status ${response.status}.`, {
    config,
    data,
    response: toEndpointResponse(response, config, data),
  });
}

function toEndpointResponse(
  response: Response,
  config: InternalEndpointRequestConfig,
  data?: unknown,
): EndpointTransportResponse {
  return {
    config,
    data,
    headers: Object.fromEntries(response.headers.entries()),
    status: response.status,
    statusText: response.statusText,
  };
}
