import type { ReactiveController } from './reactive-controller.ts';

const AriaMapping = {
  checked: 'ariaChecked',
  disabled: 'ariaDisabled',
} as const;

export default class AriaController implements ReactiveController {
  readonly #internals: ARIAMixin;

  constructor(internals: ARIAMixin) {
    this.#internals = internals;
  }

  attrChanged(
    name: keyof typeof AriaMapping,
    _: string | null,
    newValue: string | null,
  ): void {
    if (name in AriaMapping) {
      this.#internals[AriaMapping[name]] = newValue;
    }
  }
}
