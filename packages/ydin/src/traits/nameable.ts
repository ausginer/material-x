import { Str } from '../attribute.ts';
import { transfer, useAttributes } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

const $nameable: unique symbol = Symbol('Nameable');

/**
 * Element trait that exposes a string-backed nullable `name` field.
 */
export const Nameable: Trait<{ name: string | null }, typeof $nameable> = trait(
  { name: Str },
  $nameable,
);

/**
 * Branded instance interface derived from {@link Nameable}.
 */
export type Nameable = Interface<typeof Nameable>;

/**
 * Framework-facing props derived from {@link Nameable}.
 */
export type NameableProps = Props<typeof Nameable>;

/**
 * Wires the `name` attribute of `host` to the corresponding attribute on
 * `target` via a transfer callback.
 */
export function useNameable(
  host: Nameable & ControlledElement,
  target: HTMLElement,
): void {
  useAttributes(host, { name: transfer(target, 'name') });
}
