import { Bool } from '../attribute.ts';
import { useAttributes, via } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

const $checkable: unique symbol = Symbol('Checkable');

/**
 * Element trait that exposes a presence-based `checked` boolean field.
 */
export const Checkable: Trait<{ checked: boolean }, typeof $checkable> = trait(
  { checked: Bool },
  $checkable,
);

/**
 * Branded instance interface derived from {@link Checkable}.
 */
export type Checkable = Interface<typeof Checkable>;

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
