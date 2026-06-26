export type Awaitable<T> = T | Promise<T>;
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
