export class InterceptorRegistry<Fulfilled, Rejected = (error: unknown) => unknown> {
  private handlers = new Map<number, InterceptorHandler<Fulfilled, Rejected>>();
  private nextId = 0;

  use(onFulfilled?: Fulfilled, onRejected?: Rejected): number {
    const id = this.nextId;
    this.handlers.set(id, { onFulfilled, onRejected });
    this.nextId += 1;
    return id;
  }

  eject(id: number): void {
    this.handlers.delete(id);
  }

  values(): Array<InterceptorHandler<Fulfilled, Rejected>> {
    return [...this.handlers.values()];
  }
}

interface InterceptorHandler<Fulfilled, Rejected> {
  onFulfilled?: Fulfilled;
  onRejected?: Rejected;
}
