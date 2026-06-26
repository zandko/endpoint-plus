import { withTrailingSlash } from 'ufo';
import { DEFAULT_BASE_PATH, DEFAULT_TYPEGEN_OUTPUT_FILE } from '../constants/index.ts';
import { normalizeProjectRelativeFile } from '../utils/node.ts';

export interface EndpointPlusDevtoolsViteOptions {
  enabled?: boolean;
  base?: string;
  typegen?: {
    outputFile?: string;
  };
}

export function resolveOptions(options: EndpointPlusDevtoolsViteOptions = {}) {
  return {
    enabled: options.enabled ?? process.env.NODE_ENV !== 'production',
    base: withTrailingSlash(options.base ?? DEFAULT_BASE_PATH),
    typegen: {
      outputFile: normalizeProjectRelativeFile(
        options.typegen?.outputFile ?? DEFAULT_TYPEGEN_OUTPUT_FILE,
      ),
    },
  };
}
