// A stand-in for @ydinjs/core's ControlledElement: an HTMLElement subclass
// with ES private members, as the real one has.
export class ControlledElement extends HTMLElement {
  readonly #internals: ElementInternals = this.attachInternals();
  static observedAttributes?: readonly string[];
  attributeChangedCallback(
    _name: string,
    _old: string | null,
    _value: string | null,
  ): void {}
  get internals(): ElementInternals {
    return this.#internals;
  }
}

/** The marker. It has no runtime meaning: the flattener removes it. */
export function traits(
  ..._traits: ReadonlyArray<abstract new (...args: any[]) => object>
): (value: unknown, context: ClassDecoratorContext) => void {
  throw new Error('traits() is removed by the flattener');
}
