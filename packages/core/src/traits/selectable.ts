import { Bool, type ConverterOf } from '../attribute.ts';
import { transfer, useAttributes } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { AnyElement, attributes, type Props } from './attribute-traits.ts';
import { trait } from './composition.ts';

export const SELECTABLE_ATTRS: Readonly<{ selected: ConverterOf<boolean> }> = {
  selected: Bool,
};

/**
 * Element trait that exposes a presence-based `selected` boolean field.
 */
export class Selectable extends AnyElement {
  static {
    trait(this);
    attributes(this, SELECTABLE_ATTRS);
  }

  accessor selected!: boolean;
}

/**
 * Framework-facing props derived from {@link Selectable}.
 */
export type SelectableProps = Props<typeof Selectable>;

/**
 * Wires the `selected` attribute of `host` to `aria-selected` on `target`.
 */
export function useSelectable(
  host: Selectable & ControlledElement,
  target: HTMLElement,
): void {
  useAttributes(host, {
    selected: transfer(target, 'aria-selected', (value) =>
      value == null ? 'false' : 'true',
    ),
  });
}
