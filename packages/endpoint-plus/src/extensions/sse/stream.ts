import type { EndpointExtensionClient } from '../../types';
import type { EndpointSseConfig, EndpointSseResult } from './types';
import { consumeSseResponse } from './response';
import { normalizeSseError, prepareSseConfig, sendSseRequest } from './request';

export interface StreamEndpointEventsOptions<TData, TBody> {
  client: EndpointExtensionClient;
  config: EndpointSseConfig<TData, TBody>;
  url: string;
}

export async function streamEndpointEvents<TData = string, TBody = unknown>(
  options: StreamEndpointEventsOptions<TData, TBody>,
): Promise<EndpointSseResult> {
  const config = await prepareSseConfig(options);
  let closeResult: EndpointSseResult | undefined;

  try {
    const response = await sendSseRequest(config, options.config.fetch);

    await options.config.onOpen?.(response);

    const result = await consumeSseResponse(response, config, options.config);
    closeResult = result;

    return result;
  } catch (error) {
    const normalized = normalizeSseError(error, config);
    closeResult = { error: normalized };

    throw normalized;
  } finally {
    if (closeResult) {
      try {
        await options.config.onClose?.(closeResult);
      } catch {
        // Close handlers are lifecycle side effects and must not hide stream outcomes.
      }
    }
  }
}
