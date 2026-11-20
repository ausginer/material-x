import { Bool, type ConverterOf } from '../attribute.ts';
import { transfer, useAttributes } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { AnyElement, attributes, type Props } from './attribute-traits.ts';
import { trait } from './composition.ts';

export const DISABLEABLE_ATTRS: Readonly<{ disabled: ConverterOf<boolean> }> = {
  disabled: Bool,
};

/**
 * Element trait that exposes a presence-based `disabled` boolean field.
 */
@trait
@attributes(DISABLEABLE_ATTRS)
export class Disableable extends AnyElement {
  accessor disabled!: boolean;
}

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
