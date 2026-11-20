import { Str, type ConverterOf } from '../attribute.ts';
import { transfer, useAttributes } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { AnyElement, attributes, type Props } from './attribute-traits.ts';
import { trait } from './composition.ts';

export const VALUABLE_ATTRS: Readonly<{ value: ConverterOf<string> }> = {
  value: Str,
};

/**
 * Element trait that exposes a string-backed nullable `value` field.
 */
@trait
@attributes(VALUABLE_ATTRS)
export class Valuable extends AnyElement {
  accessor value!: string | null;
}

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
