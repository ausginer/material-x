import {
  internals,
  use,
  type ReactiveElement,
} from '../elements/reactive-element.ts';

const AriaMapping = {
  checked: 'ariaChecked',
  disabled: 'ariaDisabled',
} as const;

export function useAria(
  element: ReactiveElement,
  init: Partial<ARIAMixin>,
): void {
  const int = Object.assign(internals(element), init);
  use(element, {
    attrChanged(name: keyof typeof AriaMapping, _, newValue) {
      if (name in AriaMapping) {
        int[AriaMapping[name]] = newValue;
      }
    },
  });
}
