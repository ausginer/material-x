import type { ReactiveController } from './reactive-controller.ts';
import { ReactiveElement, use } from './reactive-element.ts';

const AriaMapping = {
  checked: 'ariaChecked',
  disabled: 'ariaDisabled',
} as const;

class AriaController implements ReactiveController {
  readonly #internals: ARIAMixin;

  constructor(host: ReactiveElement, init: Partial<ARIAMixin>) {
    this.#internals = host.attachInternals();
    Object.assign(this.#internals, init);
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

export function useAria(
  element: ReactiveElement,
  init: Partial<ARIAMixin>,
): void {
  use(element, new AriaController(element, init));
}
