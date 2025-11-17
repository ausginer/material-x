export type NullablePrimitive<
  T extends StringConstructor | NumberConstructor | BooleanConstructor,
> = T extends BooleanConstructor ? ReturnType<T> : ReturnType<T> | null;

export type UpdateCallback<
  T extends StringConstructor | NumberConstructor | BooleanConstructor,
> = (oldValue: NullablePrimitive<T>, newValue: NullablePrimitive<T>) => void;

export let attribute: <
  T extends StringConstructor | NumberConstructor | BooleanConstructor,
>(
  instance: AttributeManager<T>,
) => string;

export let convert: <
  T extends StringConstructor | NumberConstructor | BooleanConstructor,
>(
  instance: AttributeManager<T>,
  value: string | null,
) => NullablePrimitive<T>;

export class AttributeManager<
  T extends StringConstructor | NumberConstructor | BooleanConstructor,
> {
  static {
    attribute = (instance) => instance.#attribute;
    convert = (instance, value) => instance.#convert(value);
  }

  readonly #attribute: string;
  readonly #host: HTMLElement;
  readonly #type: T;

  constructor(host: HTMLElement, attribute: string, type: T) {
    this.#host = host;
    this.#attribute = attribute;
    this.#type = type;
  }

  get(): NullablePrimitive<T> {
    return this.#convert(this.#host.getAttribute(this.#attribute));
  }

  set(value: NullablePrimitive<T>): void {
    const isBoolean = this.#type === Boolean;

    if (value === null || (isBoolean && !value)) {
      this.#host.removeAttribute(this.#attribute);
    } else {
      this.#host.setAttribute(this.#attribute, isBoolean ? '' : String(value));
    }
  }

  #convert(value: string | null): NullablePrimitive<T> {
    if (this.#type === Boolean) {
      return (value !== null) as NullablePrimitive<T>;
    }

    return (value === null ? null : this.#type(value)) as NullablePrimitive<T>;
  }
}
