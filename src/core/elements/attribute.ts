export type NullablePrimitive<T extends string | boolean | number> =
  T extends boolean ? T : T | null;

type FromAttribute<T extends string | boolean | number> = (
  value: string | null,
) => NullablePrimitive<T>;
type ToAttribute<T extends string | boolean | number> = (
  value: NullablePrimitive<T>,
) => string | null;

export class Attribute<
  T extends string | boolean | number,
  H extends HTMLElement = HTMLElement,
> {
  static bool<H extends HTMLElement = HTMLElement>(
    host: H,
    name: string,
  ): Attribute<boolean, H> {
    return new Attribute<boolean, H>(
      host,
      name,
      (value) => value !== null,
      (value) => (value ? '' : null),
    );
  }

  static number<H extends HTMLElement = HTMLElement>(
    host: H,
    name: string,
  ): Attribute<number, H> {
    return new Attribute<number, H>(
      host,
      name,
      (value) => (value ? Number(value) : null),
      (value) => (value ? String(value) : null),
    );
  }

  static string<H extends HTMLElement = HTMLElement>(
    host: H,
    name: string,
  ): Attribute<string, H> {
    return new Attribute<string, H>(
      host,
      name,
      (value) => value,
      (value) => value,
    );
  }

  readonly host: H;
  readonly name: string;
  readonly from: FromAttribute<T>;
  readonly to: ToAttribute<T>;

  private constructor(
    host: H,
    name: string,
    fromAttribute: FromAttribute<T>,
    toAttribute: ToAttribute<T>,
  ) {
    this.host = host;
    this.name = name;
    this.from = fromAttribute;
    this.to = toAttribute;
  }

  get(): NullablePrimitive<T> {
    return this.from(this.host.getAttribute(this.name));
  }

  set(value: NullablePrimitive<T>): void {
    const converted = this.to(value);

    if (converted !== null) {
      this.host.setAttribute(this.name, converted);
    } else {
      this.host.removeAttribute(this.name);
    }
  }
}
