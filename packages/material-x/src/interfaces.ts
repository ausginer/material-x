export type FromKeys<T extends readonly PropertyKey[], V> = Readonly<
  Record<T[number], V>
>;

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

export type Values<O extends object> = O[keyof O];
