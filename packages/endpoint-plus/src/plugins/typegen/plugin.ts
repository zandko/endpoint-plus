import type { EndpointPlugin, EndpointTransportResponse } from '../../types';
import { TYPEGEN_PLUGIN } from '../constants';
import { generateTypeScriptFromJson, resolveTypeName, selectTypegenData } from './generator';
import { emitTypegenOutput } from './output';
import { resolveTypegenOptions } from './request-options';
import type { TypegenMeta, TypegenPluginOptions } from './types';

export function createTypegenPlugin(options: TypegenPluginOptions = {}): EndpointPlugin {
  return {
    id: TYPEGEN_PLUGIN,
    kind: 'plugin',
    setup(client) {
      client.registerResponseInterceptor(async (response) => {
        await maybeGenerateType(response, options);
        return response;
      });
    },
  };
}

async function maybeGenerateType(
  response: EndpointTransportResponse,
  defaults: TypegenPluginOptions,
): Promise<void> {
  const options = resolveTypegenOptions(response, defaults);
  if (!options) {
    return;
  }

  const meta = createMeta(response, resolveTypeName(response, options));

  try {
    const code = await generateTypeScriptFromJson({
      data: selectTypegenData(response, options),
      name: meta.name,
      rendererOptions: options.rendererOptions,
    });
    await emitTypegenOutput(code, meta, options.output);
  } catch (error) {
    handleTypegenError(error, options);
  }
}

function createMeta(response: EndpointTransportResponse, name: string): TypegenMeta {
  return {
    method: String(response.config.method),
    name,
    status: response.status,
    url: response.config.url,
  };
}

function handleTypegenError(error: unknown, options: TypegenPluginOptions): void {
  const missingDependency = isMissingQuicktypeCore(error);
  const behavior = missingDependency
    ? (options.missingDependency ?? 'warn')
    : (options.failure ?? 'warn');
  const message = missingDependency
    ? 'Install quicktype-core as a dev dependency to use endpoint-plus typegen.'
    : 'Failed to generate TypeScript types from endpoint response.';

  if (behavior === 'throw') {
    throw error;
  }

  if (behavior !== 'silent') {
    (options.warn ?? defaultWarn)(message, error);
  }
}

function isMissingQuicktypeCore(error: unknown): boolean {
  return error instanceof Error && error.message.includes('quicktype-core');
}

function defaultWarn(message: string, error?: unknown): void {
  console.warn(`[endpoint-plus:typegen] ${message}`, error);
}
