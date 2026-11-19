import { Str, type ConverterOf } from '../attribute.ts';
import { transfer, useAttributes } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { AnyElement, attributes, type Props } from './attribute-traits.ts';
import { trait } from './composition.ts';

export const NAMEABLE_ATTRS: Readonly<{ name: ConverterOf<string> }> = {
  name: Str,
};

/**
 * Element trait that exposes a string-backed nullable `name` field.
 */
export class Nameable extends AnyElement {
  static {
    trait(this);
    attributes(this, NAMEABLE_ATTRS);
  }

  accessor name!: string | null;
}

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
