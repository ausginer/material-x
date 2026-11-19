import { Bool, type ConverterOf } from '../attribute.ts';
import { useAttributes, via } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { AnyElement, attributes, type Props } from './attribute-traits.ts';
import { trait } from './composition.ts';

export const CHECKABLE_ATTRS: Readonly<{ checked: ConverterOf<boolean> }> = {
  checked: Bool,
};

/**
 * Element trait that exposes a presence-based `checked` boolean field.
 */
export class Checkable extends AnyElement {
  static {
    trait(this);
    attributes(this, CHECKABLE_ATTRS);
  }

  accessor checked!: boolean;
}

/**
 * Framework-facing props derived from {@link Checkable}.
 */
export type CheckableProps = Props<typeof Checkable>;

/**
 * Wires the `checked` attribute of `host` to the corresponding attribute on
 * `target` via a transfer callback.
 *
 * @remarks Does not wire form internals or custom states — use a dedicated
 * setup for those.
 */
export function useCheckable(
  host: Checkable & ControlledElement,
  target: HTMLElement,
): void {
  if (target instanceof HTMLInputElement) {
    useAttributes(host, {
      checked: via(Bool, (_, value) => {
        target.checked = value;
      }),
    });
  } else {
    useAttributes(host, {
      'aria-checked': via(Bool, (_, value) => {
        target.ariaChecked = String(value);
      }),
    });
  }
}
