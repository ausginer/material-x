type FromEntries<T> = T extends [infer K, infer V]
  ? K extends PropertyKey
    ? { [P in K]: V }
    : never
  : never;
type MergeFromEntries<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export interface TypedObjectConstructor {
  keys<O extends object>(o: O): ReadonlyArray<keyof O>;
  values<O extends object>(o: O): ReadonlyArray<O[keyof O]>;
  entries<O extends object>(
    o: O,
  ): ReadonlyArray<readonly [keyof O, O[keyof O]]>;
  fromEntries<E extends Iterable<readonly [PropertyKey, any]>>(
    entries: E,
  ): MergeFromEntries<FromEntries<E extends Iterable<infer I> ? I : never>>;
}
