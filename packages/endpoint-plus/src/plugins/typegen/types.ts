import type { Awaitable } from "../../types";
import type { EndpointTransportResponse } from '../../types';

export type TypegenOutputTarget = 'auto' | 'browser' | 'console';
export type TypegenMissingDependencyBehavior = 'warn' | 'throw' | 'silent';
export type TypegenFailureBehavior = 'warn' | 'throw' | 'silent';

export interface TypegenMeta {
  name: string;
  method: string;
  status: number;
  url?: string;
}

export type TypegenOutputHandler = (code: string, meta: TypegenMeta) => Awaitable<void>;

export interface TypegenPluginOptions {
  enabled?: boolean;
  failure?: TypegenFailureBehavior;
  missingDependency?: TypegenMissingDependencyBehavior;
  output?: TypegenOutputTarget | TypegenOutputHandler;
  rendererOptions?: Record<string, string>;
  select?: (response: EndpointTransportResponse) => unknown;
  warn?: (message: string, error?: unknown) => void;
}

export interface TypegenRequestOptions {
  failure?: TypegenFailureBehavior;
  name?: string;
  output?: TypegenOutputTarget | TypegenOutputHandler;
  rendererOptions?: Record<string, string>;
  select?: (response: EndpointTransportResponse) => unknown;
}

export type TypegenRequestExtension = boolean | TypegenRequestOptions;

declare global {
  namespace YwEndpoint {
    interface RequestExtensions {
      typegen?: TypegenRequestExtension;
    }
  }
}
