import type {
  EndpointTransport,
  EndpointTransportResponse,
  InternalEndpointRequestConfig,
} from '../types';

export class MemoryTransport implements EndpointTransport {
  public requests: InternalEndpointRequestConfig[] = [];
  private queue: Array<EndpointTransportResponse | Error> = [];

  enqueue(response: EndpointTransportResponse | Error): void {
    this.queue.push(response);
  }

  async request(config: InternalEndpointRequestConfig): Promise<EndpointTransportResponse> {
    this.requests.push(config);
    const next = this.queue.shift();

    if (next instanceof Error) {
      throw next;
    }

    return (
      next ?? {
        data: { code: 20000, data: { ok: true }, message: 'ok' },
        status: 200,
        config,
      }
    );
  }
}
