import type { ReactiveController } from '../elements/reactive-controller.ts';
import { use, type ReactiveElement } from '../elements/reactive-element.ts';
import { useInternals } from './useInternals.ts';

const AriaMapping = {
  checked: 'ariaChecked',
  disabled: 'ariaDisabled',
} as const;

class AriaController implements ReactiveController {
  readonly #internals: ARIAMixin;

  constructor(host: ReactiveElement, init: Partial<ARIAMixin>) {
    this.#internals = useInternals(host);
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
