import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    browser: 'src/browser/index.ts',
    index: 'src/index.ts',
    miniapp: 'src/miniapp/index.ts',
    node: 'src/node/index.ts',
    'extensions/polling': 'src/extensions/polling/index.ts',
    'extensions/sse': 'src/extensions/sse/index.ts',
    'extensions/workflow': 'src/extensions/workflow/index.ts',
    'plugins/auth-token': 'src/plugins/auth-token/index.ts',

    'plugins/observability': 'src/plugins/observability/index.ts',
    'plugins/refresh-token': 'src/plugins/refresh-token/index.ts',
    'plugins/request-cache': 'src/plugins/request-cache/index.ts',
    'plugins/request-gate': 'src/plugins/request-gate/index.ts',
    'plugins/retry': 'src/plugins/retry/index.ts',
    'plugins/typegen': 'src/plugins/typegen/index.ts',
    'transports/axios': 'src/transport/axios/index.ts',
    'transports/fetch': 'src/transport/fetch/index.ts',
    'transports/miniapp': 'src/transport/miniapp/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2022',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
});
