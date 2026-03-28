/**
 * Primitive JavaScript values supported by the built-in attribute converters.
 */
export type AttributePrimitive = boolean | number | string;

/**
 * Nullable shape produced by attribute-backed values.
 *
 * `boolean` attributes are presence-based and therefore stay non-nullable,
 * while `number` and `string` attributes may be absent.
 *
 * @typeParam T - The primitive value represented by the attribute.
 */
export type NullablePrimitive<T extends AttributePrimitive> = T extends boolean
  ? T
  : T | null;

/**
 * Generic attribute converter tuple for a primitive value type.
 *
 * This helper allows built-in converters such as {@link Str} to be narrowed
 * at compile time, for example `Str as ConverterOf<'primary' | 'secondary'>`.
 *
 * @remarks This narrowing affects only the static type contract. Runtime
 * conversion stays unchanged and does not validate string unions.
 *
 * @typeParam T - The primitive value represented by the converter.
 */
export type ConverterOf<T extends AttributePrimitive> = readonly [
  (value: string | null) => NullablePrimitive<T>,
  (value: NullablePrimitive<T>) => string | null,
];

/**
 * Presence-based attribute converter.
 *
 * Reads `null` as `false` and any present attribute value as `true`. Writes
 * `true` as an empty string and removes the attribute for `false`.
 */
export const Bool: ConverterOf<boolean> = [
  (value: string | null): boolean => value !== null,
  (value: boolean): string | null => (value ? '' : null),
] as const;

/**
 * Presence-based attribute converter tuple.
 */
export type Bool = typeof Bool;

/**
 * Numeric attribute converter.
 *
 * Missing, empty, and invalid numeric strings are normalized to `null`.
 * Writing `null` or `NaN` removes the attribute.
 */
export const Num: ConverterOf<number> = [
  (value: string | null): number | null => {
    if (value == null || value === '') {
      return null;
    }

    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  },
  (value: number | null): string | null =>
    value != null && !isNaN(value) ? String(value) : null,
] as const;

/**
 * Numeric attribute converter tuple.
 */
export type Num = typeof Num;

/**
 * Identity converter for nullable string attributes.
 */
export const Str: ConverterOf<string> = [
  (value: string | null): string | null => value,
  (value: string | null): string | null => value,
] as const;

/**
 * Nullable string attribute converter tuple.
 */
export type Str = typeof Str;

/**
 * Built-in converter tuple understood by {@link operator}.
 */
export type Converter<T extends AttributePrimitive = any> = ConverterOf<T>;

/**
 * JavaScript value produced when reading through a converter.
 *
 * @typeParam C - The converter used to read the attribute.
 */
export type FromConverter<C extends Converter> = C extends readonly [
  (value: string | null) => infer T,
  ...(readonly unknown[]),
]
  ? T
  : never;

/**
 * Built-in converter selected for a primitive value type.
 *
 * @typeParam T - The primitive value written to the attribute.
 */
export type ToConverter<T extends AttributePrimitive> = T extends boolean
  ? Bool
  : T extends number
    ? Num
    : Str;

/**
 * Typed helpers for reading and writing DOM attributes through converters.
 *
 * `get` and `set` work with typed values, while `getRaw` and `setRaw` expose
 * the underlying string-based DOM API directly.
 */
export interface AttributeOperator {
  /**
   * Reads an attribute and converts it to a typed JavaScript value.
   */
  get<C extends Converter>(
    host: HTMLElement,
    name: string,
    converter: C,
  ): FromConverter<C>;

  /**
   * Converts a typed JavaScript value and writes it back to the DOM attribute.
   */
  set<C extends Converter>(
    host: HTMLElement,
    name: string,
    value: FromConverter<C>,
    converter: C,
  ): void;

  /**
   * Reads the raw serialized string value of an attribute.
   */
  getRaw(host: HTMLElement, name: string): string | null;

  /**
   * Writes the raw serialized string value of an attribute.
   *
   * Passing `null` removes the attribute from the element.
   */
  setRaw(host: HTMLElement, name: string, value: string | null): void;
}

/**
 * Default attribute operator for typed DOM attribute access.
 *
 * This is the main entrypoint for reading and writing attributes with the
 * built-in converter tuples. Raw string access remains available through
 * `getRaw` and `setRaw`.
 */
export const operator: AttributeOperator = {
  get<C extends Converter>(
    host: HTMLElement,
    name: string,
    [from]: C,
  ): FromConverter<C> {
    return from(operator.getRaw(host, name));
  },
  set<C extends Converter>(
    host: HTMLElement,
    name: string,
    value: FromConverter<C>,
    [, to]: C,
  ) {
    operator.setRaw(host, name, to(value));
  },
  getRaw(host, name) {
    return host.getAttribute(name);
  },
  setRaw(host, name, value): void {
    if (value !== null) {
      host.setAttribute(name, value);
    } else {
      host.removeAttribute(name);
    }
  },
} as const;

export default operator;
