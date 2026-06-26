import { EndpointClient } from 'endpoint-plus';
import type { EndpointTransportResponse, EndpointRequestConfig } from 'endpoint-plus';
import type { DevtoolsConfig } from '../types/index.ts';
import { captureResponse, installBridge, mountLauncherButton } from './bridge.ts';
import { DEFAULT_BASE_PATH, DEFAULT_TYPEGEN_OUTPUT_FILE } from '../constants/index.ts';

export interface DevtoolsClientOptions {
  base?: string;
  typegen?: {
    outputFile?: string;
  };
}

const IS_TELEMETRY_HOOKED = Symbol('endpoint-plus-devtools');

function attachTelemetryInterceptors(client: EndpointClient): void {
  client.registerResponseInterceptor((response: EndpointTransportResponse) => {
    try {
      const method = String(response.config.method).toUpperCase();
      const url = response.config.url ?? '';
      const data = response.data;

      if (data !== undefined && data !== null) {
        captureResponse(method, url, data);
      }
    } catch (err) {
      console.warn('[endpoint-plus-devtools] Failed to capture response:', err);
    }
    return response;
  });
}

const nativeRequest = EndpointClient.prototype.request as unknown as (
  this: EndpointClient,
  config: EndpointRequestConfig,
) => Promise<unknown>;

EndpointClient.prototype.request = function (
  this: EndpointClient,
  config: EndpointRequestConfig,
): Promise<unknown> {
  const record = this as unknown as Record<symbol, boolean>;
  if (!record[IS_TELEMETRY_HOOKED]) {
    record[IS_TELEMETRY_HOOKED] = true;
    attachTelemetryInterceptors(this);
  }
  return nativeRequest.call(this, config);
};

export function installClient(options: DevtoolsClientOptions = {}): void {
  if (typeof window === 'undefined') {
    return;
  }

  const basePath = options.base ?? DEFAULT_BASE_PATH;
  const config: DevtoolsConfig = {
    typegen: {
      outputFile: options.typegen?.outputFile ?? DEFAULT_TYPEGEN_OUTPUT_FILE,
    },
  };

  installBridge(config);
  mountLauncherButton(basePath);
}
