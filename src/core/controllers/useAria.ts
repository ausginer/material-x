import { use, type ReactiveElement } from '../elements/reactive-element.ts';
import { useInternals } from './useInternals.ts';

const AriaMapping = {
  checked: 'ariaChecked',
  disabled: 'ariaDisabled',
} as const;

export function useAria(
  element: ReactiveElement,
  init: Partial<ARIAMixin>,
): void {
  const internals = Object.assign(useInternals(element), init);
  use(element, {
    attrChanged(name: keyof typeof AriaMapping, _, newValue) {
      if (name in AriaMapping) {
        internals[AriaMapping[name]] = newValue;
      }
    },
  });
}
