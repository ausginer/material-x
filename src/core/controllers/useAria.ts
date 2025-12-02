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
  const _internals = Object.assign(internals(element), init);
  use(element, {
    attrChanged(name: keyof typeof AriaMapping, _, newValue) {
      if (name in AriaMapping) {
        _internals[AriaMapping[name]] = newValue;
      }
    },
  });
}
