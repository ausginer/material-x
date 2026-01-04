declare global {
  /* @internal */
  interface ObjectConstructor {
    keys<O extends object>(o: O): ReadonlyArray<keyof O>;
    values<O extends object>(o: O): ReadonlyArray<O[keyof O]>;
    entries<const O extends object>(
      o: O,
    ): ReadonlyArray<Required<{ [K in keyof O]: [K, O[K]] }>[keyof O]>;
    fromEntries<const T extends ReadonlyArray<readonly [PropertyKey, any]>>(
      entries: T,
    ): Readonly<{ [K in T[number] as K[0]]: K[1] }>;
    fromEntries<T extends Iterable<readonly [PropertyKey, any]>>(
      entries: T,
    ): T extends Iterable<readonly [infer K, infer V]>
      ? // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
        Readonly<{ [P in K & PropertyKey]: V }>
      : never;
  }

  /* @internal */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ReadonlyArray<T> {
    includes(searchElement: unknown, fromIndex?: number): boolean;
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export type FromKeys<T extends readonly PropertyKey[], V> = Readonly<{
  [K in T[number]]: V;
}>;

export type CustomElementProperties<
  Attrs extends Record<string, unknown>,
  Props extends Record<string, unknown>,
  Events extends Record<string, Event>,
> = Readonly<
  Attrs &
    Props & {
      [E in keyof Events as `on${E & string}`]: (event: Events[E]) => void;
    }
>;
export type Entries<T, K extends keyof T = keyof T> = ReadonlyArray<
  K extends unknown ? [K, T[K]] : never
>;
export type Values<T, K extends keyof T = keyof T> = ReadonlyArray<
  K extends unknown ? T[K] : never
>;
