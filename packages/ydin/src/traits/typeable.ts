import { Str } from '../attribute.ts';
import { transfer, useAttributes } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

const $typeable: unique symbol = Symbol('Typeable');

/**
 * Element trait that exposes a string-backed nullable `type` field.
 */
export const Typeable: Trait<{ type: string | null }, typeof $typeable> = trait(
  { type: Str },
  $typeable,
);

/**
 * Branded instance interface derived from {@link Typeable}.
 */
export type Typeable = Interface<typeof Typeable>;

/**
 * Framework-facing props derived from {@link Typeable}.
 */
export type TypeableProps = Props<typeof Typeable>;

/**
 * Wires the `type` attribute of `host` to the corresponding attribute on
 * `target` via a transfer callback.
 */
export function useTypeable(
  host: Typeable & ControlledElement,
  target: HTMLElement,
): void {
  useAttributes(host, { type: transfer(target, 'type') });
}
