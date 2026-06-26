import type { CachedEndpointResponse, RequestCacheStore } from './types';

export class MemoryRequestCacheStore implements RequestCacheStore {
  private records = new Map<string, CachedEndpointResponse>();

  clear(): void {
    this.records.clear();
  }

  delete(key: string): void {
    this.records.delete(key);
  }

  get(key: string): CachedEndpointResponse | undefined {
    const record = this.records.get(key);

    if (!record) {
      return undefined;
    }

    if (record.expiresAt <= Date.now()) {
      this.records.delete(key);
      return undefined;
    }

    return record;
  }

  set(key: string, value: CachedEndpointResponse): void {
    this.records.set(key, value);
  }
}
