import type { Awaitable } from "../../types";
import type {
  EndpointExtension,
  EndpointExtensionClient,
  EndpointRequestConfig,
} from '../../types';
import { WORKFLOW_EXTENSION } from '../constants';

export interface EndpointWorkflowExtension {
  all<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    requests: Array<EndpointRequestConfig<TBody, TResponse>>,
  ): Promise<TResult[]>;
  pipeline<TInput, TOutput = TInput>(
    input: TInput,
    steps: EndpointPipelineStep[],
  ): Promise<TOutput>;
  sequence<TResponse = unknown, TResult = TResponse, TBody = unknown>(
    requests: Array<EndpointRequestConfig<TBody, TResponse>>,
  ): Promise<TResult[]>;
}

export type EndpointPipelineStep<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  client: EndpointExtensionClient,
) => Awaitable<TOutput>;

export function createWorkflowExtension(): EndpointExtension<EndpointWorkflowExtension> {
  return {
    id: WORKFLOW_EXTENSION,
    kind: 'extension',
    setup(client: EndpointExtensionClient) {
      return {
        all<TResponse = unknown, TResult = TResponse, TBody = unknown>(
          requests: Array<EndpointRequestConfig<TBody, TResponse>>,
        ) {
          return Promise.all(
            requests.map((requestConfig) =>
              client.request<TResponse, TResult, TBody>(requestConfig),
            ),
          );
        },
        async pipeline<TInput, TOutput = TInput>(
          input: TInput,
          steps: EndpointPipelineStep[],
        ): Promise<TOutput> {
          let current: unknown = input;

          for (const step of steps) {
            current = await step(current, client);
          }

          return current as TOutput;
        },
        async sequence<TResponse = unknown, TResult = TResponse, TBody = unknown>(
          requests: Array<EndpointRequestConfig<TBody, TResponse>>,
        ) {
          const results: TResult[] = [];

          for (const requestConfig of requests) {
            results.push(await client.request<TResponse, TResult, TBody>(requestConfig));
          }

          return results;
        },
      } satisfies EndpointWorkflowExtension;
    },
  };
}

export { WORKFLOW_EXTENSION };
