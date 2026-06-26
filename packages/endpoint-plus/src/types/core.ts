import type { Awaitable, StrictOmit } from './shared';
import type { FetchOptions, ResponseType, SearchParameters } from 'ofetch';

export type EndpointMethod =
  | NonNullable<FetchOptions['method']>
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PUT';
export type EndpointHeaders = Record<string, string>;
export type EndpointResponseType = ResponseType | 'arraybuffer';
export type EndpointReturnMode = 'data' | 'response';
export type FetchLike = typeof globalThis.fetch;

export interface EndpointProgressEvent {
  loaded: number;
  total?: number;
  progress?: number;
  bytes?: number;
  rate?: number;
  estimated?: number;
  event?: unknown;
}

export interface EndpointRequestContext {
  disableRetry?: boolean;
  isRefresh?: boolean;
  isRefreshTokenRetry?: boolean;
  retryAttempt?: number;
  [key: string]: unknown;
  [key: symbol]: unknown;
}

declare global {
  namespace YwEndpoint {
    interface RequestExtensions {}
  }
}

export interface EndpointRequestExtensions extends YwEndpoint.RequestExtensions {}

type EndpointRouteMap = import('../index').YwEndpoint.Routes;

type EndpointRoutePath<TEndpointRouteKey extends string> =
  TEndpointRouteKey extends `${string} ${infer TPath}` ? TPath : never;

type EndpointUrlPath<TUrl extends string> = TUrl extends `${infer TPath}?${string}`
  ? EndpointUrlPath<TPath>
  : TUrl extends `${infer TPath}#${string}`
    ? EndpointUrlPath<TPath>
    : TUrl extends `${string}://${string}/${infer TPath}`
      ? `/${TPath}`
      : TUrl;

type EndpointTrimSlashes<TPath extends string> = TPath extends `/${infer TRest}`
  ? EndpointTrimSlashes<TRest>
  : TPath extends `${infer TRest}/`
    ? EndpointTrimSlashes<TRest>
    : TPath;

type EndpointSplitPath<TPath extends string> =
  EndpointTrimSlashes<TPath> extends ''
    ? []
    : EndpointTrimSlashes<TPath> extends `${infer THead}/${infer TTail}`
      ? [THead, ...EndpointSplitPath<TTail>]
      : [EndpointTrimSlashes<TPath>];

type EndpointSegmentMatches<
  TRouteSegment extends string,
  TUrlSegment extends string,
> = TRouteSegment extends `:${string}`
  ? TUrlSegment extends ''
    ? false
    : true
  : TRouteSegment extends TUrlSegment
    ? true
    : false;

type EndpointPathSegmentsMatch<
  TRouteSegments extends readonly string[],
  TUrlSegments extends readonly string[],
> = TRouteSegments extends readonly [
  infer TRouteHead extends string,
  ...infer TRouteTail extends string[],
]
  ? TUrlSegments extends readonly [
      infer TUrlHead extends string,
      ...infer TUrlTail extends string[],
    ]
    ? EndpointSegmentMatches<TRouteHead, TUrlHead> extends true
      ? EndpointPathSegmentsMatch<TRouteTail, TUrlTail>
      : false
    : false
  : TUrlSegments extends []
    ? true
    : false;

type EndpointRoutePathMatches<
  TRoutePath extends string,
  TUrl extends string,
> = EndpointPathSegmentsMatch<
  EndpointSplitPath<TRoutePath>,
  EndpointSplitPath<EndpointUrlPath<TUrl>>
>;

type EndpointExactRouteKey<
  TMethod extends string,
  TUrl extends string,
> = `${Uppercase<TMethod>} ${EndpointUrlPath<TUrl>}` extends keyof EndpointRouteMap
  ? `${Uppercase<TMethod>} ${EndpointUrlPath<TUrl>}`
  : never;

type EndpointPatternRouteKey<TMethod extends string, TUrl extends string> = {
  [TRouteKey in keyof EndpointRouteMap &
    string]: TRouteKey extends `${Uppercase<TMethod>} ${string}`
    ? EndpointRoutePathMatches<EndpointRoutePath<TRouteKey>, TUrl> extends true
      ? TRouteKey
      : never
    : never;
}[keyof EndpointRouteMap & string];

export type EndpointRouteKey<TMethod extends string, TUrl extends string> =
  EndpointExactRouteKey<TMethod, TUrl> extends never
    ? EndpointPatternRouteKey<TMethod, TUrl>
    : EndpointExactRouteKey<TMethod, TUrl>;

export type EndpointRouteResponse<
  TMethod extends string,
  TUrl extends string,
  TFallback = unknown,
> =
  EndpointRouteKey<TMethod, TUrl> extends keyof EndpointRouteMap
    ? EndpointRouteMap[EndpointRouteKey<TMethod, TUrl>] extends { response: infer TResponse }
      ? TResponse
      : TFallback
    : TFallback;

export interface EndpointRequestConfig<D = unknown, _TResponse = unknown> extends StrictOmit<
  FetchOptions,
  'body' | 'cache' | 'headers' | 'method' | 'query' | 'responseType'
> {
  baseURL?: string;
  bodySerializer?: (data: unknown, config: InternalEndpointRequestConfig) => unknown;
  url?: string;
  method?: EndpointMethod;
  headers?: EndpointHeaders;
  params?: SearchParameters;
  paramsSerializer?: (params: SearchParameters, config: InternalEndpointRequestConfig) => string;
  data?: D;
  onDownloadProgress?: (event: EndpointProgressEvent) => void;
  onUploadProgress?: (event: EndpointProgressEvent) => void;
  responseDeserializer?: (data: unknown, response: unknown) => unknown;
  responseType?: EndpointResponseType;
  requireAuth?: boolean;
  setAuthorizationHeader?:
    | string
    | ((config: InternalEndpointRequestConfig) => Awaitable<string | null>);
  headerPrefix?: string;
  returnMode?: EndpointReturnMode;
  extensions?: EndpointRequestExtensions;
  context?: EndpointRequestContext;
}

export interface InternalEndpointRequestConfig<
  D = unknown,
  _TResponse = unknown,
> extends EndpointRequestConfig<D, _TResponse> {
  method: EndpointMethod;
  headers: EndpointHeaders;
}
