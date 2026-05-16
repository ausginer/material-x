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
 * Shape accepted when writing attribute-backed values.
 *
 * `undefined` is accepted as a framework-friendly absent value and serializes
 * like `null` for nullable converters.
 *
 * @typeParam T - The primitive value represented by the attribute.
 */
type WritablePrimitive<T extends AttributePrimitive> = T extends boolean
  ? T
  : T | null | undefined;

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
export type ConverterOf<T extends AttributePrimitive> = Readonly<{
  from(value: string | null): NullablePrimitive<T>;
  to(value: WritablePrimitive<T>): string | null;
}>;

/**
 * Presence-based attribute converter.
 *
 * Reads `null` as `false` and any present attribute value as `true`. Writes
 * `true` as an empty string and removes the attribute for `false`.
 */
export const Bool: ConverterOf<boolean> = {
  from: (value) => value !== null,
  to: (value) => (value ? '' : null),
};

/**
 * Presence-based attribute converter tuple.
 */
export type Bool = typeof Bool;

/**
 * Numeric attribute converter.
 *
 * Missing, empty, and invalid numeric strings are normalized to `null`.
 * Writing `null`, `undefined`, or `NaN` removes the attribute.
 */
export const Num: ConverterOf<number> = {
  from(value) {
    if (!value) {
      return null;
    }

    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  },
  to: (value) => (value != null && !isNaN(value) ? String(value) : null),
};

/**
 * Numeric attribute converter tuple.
 */
export type Num = typeof Num;

/**
 * Identity converter for nullable string attributes.
 *
 * Writing `null` or `undefined` removes the attribute.
 */
export const Str: ConverterOf<string> = {
  from: (value) => value,
  to: (value) => value ?? null,
};

/**
 * Nullable string attribute converter tuple.
 */
export type Str = typeof Str;

/**
 * Built-in converter selected for a primitive JavaScript value type.
 *
 * @typeParam T - Primitive value whose built-in converter should be selected.
 */
export type ConverterForPrimitive<T extends AttributePrimitive> =
  T extends boolean ? Bool : T extends number ? Num : Str;

/**
 * JavaScript value produced by a converter's `from(...)` reader.
 *
 * @typeParam C - Converter whose read value should be extracted.
 */
export type ConverterReadValue<C extends ConverterOf<any>> = C extends {
  from(value: string | null): infer T;
}
  ? T
  : never;

/**
 * JavaScript value accepted by a converter's `to(...)` writer.
 *
 * @typeParam C - Converter whose write value should be extracted.
 */
export type ConverterWriteValue<C extends ConverterOf<any>> = C extends {
  to(value: infer T): string | null;
}
  ? T
  : never;

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
  get<C extends ConverterOf<any>>(
    host: HTMLElement,
    name: string,
    converter: C,
  ): ConverterReadValue<C>;

  /**
   * Converts a typed JavaScript value and writes it back to the DOM attribute.
   */
  set<C extends ConverterOf<any>>(
    host: HTMLElement,
    name: string,
    value: ConverterWriteValue<C>,
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
  get(host, name, { from }) {
    return from(operator.getRaw(host, name));
  },
  set(host, name, value, { to }) {
    operator.setRaw(host, name, to(value));
  },
  getRaw(host, name) {
    return host.getAttribute(name);
  },
  setRaw(host, name, value): void {
    if (value != null) {
      host.setAttribute(name, value);
    } else {
      host.removeAttribute(name);
    }
  },
} as const;

export default operator;
