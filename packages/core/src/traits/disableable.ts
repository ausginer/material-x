import { Bool, type ConverterOf } from '../attribute.ts';
import { transfer, useAttributes } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

const $disableable: unique symbol = Symbol('Disableable');

export const DISABLEABLE_ATTRS: Readonly<{ disabled: ConverterOf<boolean> }> = {
  disabled: Bool,
};

/**
 * Element trait that exposes a presence-based `disabled` boolean field.
 */
export const Disableable: Trait<{ disabled: boolean }, typeof $disableable> =
  trait(DISABLEABLE_ATTRS, $disableable);

/**
 * Branded instance interface derived from {@link Disableable}.
 */
export type Disableable = Interface<typeof Disableable>;

/**
 * Framework-facing props derived from {@link Disableable}.
 */
export type DisableableProps = Props<typeof Disableable>;

/**
 * Wires the `disabled` attribute of `host` to the corresponding attribute on
 * `target` via a transfer callback.
 */
export function useDisableable(
  host: Disableable & ControlledElement,
  target: HTMLElement,
): void {
  useAttributes(host, { disabled: transfer(target, 'disabled') });
}
