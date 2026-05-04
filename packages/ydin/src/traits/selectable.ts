import { Bool, type ConverterOf } from '../attribute.ts';
import { transfer, useAttributes } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

const $selectable: unique symbol = Symbol('Selectable');

export const SELECTABLE_ATTRS: Readonly<{ selected: ConverterOf<boolean> }> = {
  selected: Bool,
};

/**
 * Element trait that exposes a presence-based `selected` boolean field.
 */
export const Selectable: Trait<{ selected: boolean }, typeof $selectable> =
  trait(SELECTABLE_ATTRS, $selectable);

/**
 * Branded instance interface derived from {@link Selectable}.
 */
export type Selectable = Interface<typeof Selectable>;

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
