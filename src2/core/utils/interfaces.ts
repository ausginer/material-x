export interface TypedObjectConstructor {
  entries<O extends object>(
    o: O,
  ): ReadonlyArray<readonly [keyof O, O[keyof O]]>;
}
