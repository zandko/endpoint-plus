import type { EndpointPlugin } from '../../types';
import { OBSERVABILITY_PLUGIN } from '../constants';
import type { ObservabilityPluginOptions } from './types';

export function createObservabilityPlugin(
  options: ObservabilityPluginOptions = {},
): EndpointPlugin {
  const now = options.now ?? getTimestamp;

  return {
    id: OBSERVABILITY_PLUGIN,
    kind: 'plugin',
    setup(client) {
      client.registerRequestMiddleware(async (request, next) => {
        const startedAt = now();
        await options.onRequest?.({ request, startedAt });

        try {
          const response = await next(request);
          const endedAt = now();
          await options.onResponse?.({
            duration: endedAt - startedAt,
            endedAt,
            request: response.config,
            response,
            startedAt,
          });

          return response;
        } catch (error) {
          const endedAt = now();
          await options.onError?.({
            duration: endedAt - startedAt,
            endedAt,
            error,
            request,
            startedAt,
          });

          throw error;
        }
      });
    },
  };
}

function getTimestamp(): number {
  return globalThis.performance?.now() ?? Date.now();
}
