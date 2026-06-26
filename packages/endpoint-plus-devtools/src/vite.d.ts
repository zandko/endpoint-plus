import type { Plugin as VitePlugin } from 'vite';
import type { EndpointPlusDevtoolsViteOptions } from './vite-plugin/options.ts';

export type { EndpointPlusDevtoolsViteOptions };

export default function endpointPlusDevtools(options?: EndpointPlusDevtoolsViteOptions): VitePlugin;

export { endpointPlusDevtools };
