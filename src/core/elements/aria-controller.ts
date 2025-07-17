const AriaMapping: Readonly<Record<string, keyof ARIAMixin>> = {
  checked: 'ariaChecked',
  disabled: 'ariaDisabled',
};

export default class AriaController {
  readonly #internals: ElementInternals;

  constructor(_: HTMLElement, internals: ElementInternals) {
    this.#internals = internals;
  }

  attrChanged(name: string, _: string | null, newValue: string | null): void {
    if (name in AriaMapping) {
      this.#internals[AriaMapping[name]] = newValue;
    }
  }
}
