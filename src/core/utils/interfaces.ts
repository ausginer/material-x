export type Entries<T, K extends keyof T = keyof T> = ReadonlyArray<
  K extends unknown ? [K, T[K]] : never
>;

export type Values<T, K extends keyof T = keyof T> = ReadonlyArray<
  K extends unknown ? T[K] : never
>;
