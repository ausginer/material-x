import { Str, type ConverterOf } from '../attribute.ts';
import { transfer, useAttributes } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

const $valuable: unique symbol = Symbol('Valuable');

export const VALUABLE_ATTRS: Readonly<{ value: ConverterOf<string> }> = {
  value: Str,
};

/**
 * Element trait that exposes a string-backed nullable `value` field.
 */
export const Valuable: Trait<{ value: string | null }, typeof $valuable> =
  trait(VALUABLE_ATTRS, $valuable);

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
