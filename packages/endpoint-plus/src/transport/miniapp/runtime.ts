import type { MiniappRequest, MiniappTransportOptions } from './types';

export function resolveMiniappRequest(options: MiniappTransportOptions): MiniappRequest {
  if (options.request) {
    return options.request;
  }

  if (options.runtime) {
    return options.runtime.request.bind(options.runtime);
  }

  throw new Error(
    'No miniapp request implementation found. Provide createMiniappTransport({ runtime }) or createMiniappTransport({ request }).',
  );
}
