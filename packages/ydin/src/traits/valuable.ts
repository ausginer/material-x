import { Str } from '../attribute.ts';
import { transfer, useAttributes } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

const $valuable: unique symbol = Symbol('Valuable');

/**
 * Element trait that exposes a string-backed nullable `value` field.
 */
export const Valuable: Trait<{ value: string | null }, typeof $valuable> =
  trait({ value: Str }, $valuable);

/**
 * Branded instance interface derived from {@link Valuable}.
 */
export type Valuable = Interface<typeof Valuable>;

/**
 * Framework-facing props derived from {@link Valuable}.
 */
export type ValuableProps = Props<typeof Valuable>;

/**
 * Wires the `value` attribute of `host` to the corresponding attribute on
 * `target` via a transfer callback.
 */
export function useValuable(
  host: Valuable & ControlledElement,
  target: HTMLElement,
): void {
  useAttributes(host, { value: transfer(target, 'value') });
}
