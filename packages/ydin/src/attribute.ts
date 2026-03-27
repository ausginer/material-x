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
 * Presence-based attribute converter.
 *
 * Reads `null` as `false` and any present attribute value as `true`. Writes
 * `true` as an empty string and removes the attribute for `false`.
 */
export const Bool = [
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
export const Num = [
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
export const Str = [
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
export type Converter = Bool | Num | Str;

/**
 * JavaScript value produced when reading through a converter.
 *
 * @typeParam C - The converter used to read the attribute.
 */
export type FromConverter<C extends Converter> = C extends Bool
  ? boolean
  : C extends Num
    ? number | null
    : C extends Str
      ? string | null
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
  get(host: HTMLElement, name: string, converter: Bool): boolean;
  get(host: HTMLElement, name: string, converter: Num): number | null;
  get(host: HTMLElement, name: string, converter: Str): string | null;
  get(
    host: HTMLElement,
    name: string,
    converter: Converter,
  ): AttributePrimitive | null;

  /**
   * Converts a typed JavaScript value and writes it back to the DOM attribute.
   */
  set(host: HTMLElement, name: string, value: boolean, converter: Bool): void;
  set(
    host: HTMLElement,
    name: string,
    value: number | null,
    converter: Num,
  ): void;
  set(
    host: HTMLElement,
    name: string,
    value: string | null,
    converter: Str,
  ): void;
  set(
    host: HTMLElement,
    name: string,
    value: AttributePrimitive | null,
    converter: Converter,
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
  // @ts-expect-error: too generic for TS
  get(host, name, [from]) {
    return from(operator.getRaw(host, name));
  },
  set(host, name, value, [, to]) {
    // @ts-expect-error: too generic for TS
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
