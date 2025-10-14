export interface TypedObjectConstructor {
  entries<O extends object>(
    o: O,
  ): ReadonlyArray<readonly [keyof O, O[keyof O]]>;
}

export type Entries<T, K extends keyof T = keyof T> = ReadonlyArray<
  K extends unknown ? [K, T[K]] : never
>;

export type Values<T, K extends keyof T = keyof T> = ReadonlyArray<
  K extends unknown ? T[K] : never
>;
