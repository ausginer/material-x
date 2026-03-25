export type AttributePrimitive = boolean | number | string;

export type NullablePrimitive<T extends AttributePrimitive> = T extends boolean
  ? T
  : T | null;

export const Bool = [
  (value: string | null): boolean => value !== null,
  (value: boolean): string | null => (value ? '' : null),
] as const;
export type Bool = typeof Bool;

export const Num = [
  (value: string | null): number | null => (value ? Number(value) : null),
  (value: number | null): string | null =>
    value && !isNaN(value) ? String(value) : null,
] as const;
export type Num = typeof Num;

export const Str = [
  (value: string | null): string | null => value,
  (value: string | null): string | null => value,
] as const;
export type Str = typeof Str;

export type Converter = Bool | Num | Str;

export type FromConverter<C extends Converter> = C extends Bool
  ? boolean
  : C extends Num
    ? number
    : C extends Str
      ? string
      : never;

export type ToConverter<T extends AttributePrimitive> = T extends boolean
  ? Bool
  : T extends number
    ? Num
    : Str;

export interface AttributeOperator {
  get(host: HTMLElement, name: string, converter: Bool): boolean;
  get(host: HTMLElement, name: string, converter: Num): number | null;
  get(host: HTMLElement, name: string, converter: Str): string | null;
  get(
    host: HTMLElement,
    name: string,
    converter: Converter,
  ): AttributePrimitive | null;

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

  getRaw(host: HTMLElement, name: string): string | null;
  setRaw(host: HTMLElement, name: string, value: string | null): void;
}

export const ATTRIBUTE: AttributeOperator = {
  // @ts-expect-error: too generic for TS
  get(host, name, [from]) {
    return from(ATTRIBUTE.getRaw(host, name));
  },
  set(host, name, value, [, to]) {
    // @ts-expect-error: too generic for TS
    ATTRIBUTE.setRaw(host, name, to(value));
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
