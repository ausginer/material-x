export interface TypedObjectConstructor {
  keys<O extends object>(o: O): ReadonlyArray<keyof O>;
  values<O extends object>(o: O): ReadonlyArray<O[keyof O]>;
  entries<O extends object>(
    o: O,
  ): ReadonlyArray<readonly [keyof O, Required<O>[keyof O]]>;
  fromEntries<E extends Iterable<readonly [PropertyKey, any]>>(
    entries: E,
  ): E extends Iterable<readonly [infer K, infer V]>
    ? Readonly<Record<K extends PropertyKey ? K : never, V>>
    : never;
}

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
