import type { EndpointTransportResponse } from '../../types';
import type { ResolvedTypegenOptions } from './request-options';
import { inferTypeName } from './type-name';

export interface GenerateTypeScriptOptions {
  data: unknown;
  name: string;
  rendererOptions?: Record<string, string>;
}

type QuicktypeCore = typeof import('quicktype-core');

export async function generateTypeScriptFromJson({
  data,
  name,
  rendererOptions,
}: GenerateTypeScriptOptions): Promise<string> {
  const json = stringifyJsonSample(data);
  const quicktypeCore = await loadQuicktypeCore();
  const jsonInput = quicktypeCore.jsonInputForTargetLanguage('typescript');

  await jsonInput.addSource({
    name,
    samples: [json],
  });

  const inputData = new quicktypeCore.InputData();
  inputData.addInput(jsonInput);

  const result = await quicktypeCore.quicktype({
    inputData,
    lang: 'typescript',
    rendererOptions: {
      'just-types': 'true',
      ...rendererOptions,
    },
  });

  return result.lines.join('\n');
}

export function resolveTypeName(
  response: EndpointTransportResponse,
  options: ResolvedTypegenOptions,
): string {
  return options.name ?? inferTypeName(response);
}

export function selectTypegenData(
  response: EndpointTransportResponse,
  options: ResolvedTypegenOptions,
): unknown {
  return (options.select ?? defaultSelect)(response);
}

function defaultSelect(response: EndpointTransportResponse): unknown {
  return response.data;
}

function stringifyJsonSample(data: unknown): string {
  const json = JSON.stringify(data);
  if (json === undefined) {
    throw new Error('Typegen only supports JSON-serializable response data.');
  }

  return json;
}

async function loadQuicktypeCore(): Promise<QuicktypeCore> {
  return await import('quicktype-core');
}
