import { Str, type ConverterOf } from '../attribute.ts';
import { transfer, useAttributes } from '../controllers/useAttributes.ts';
import type { ControlledElement } from '../element.ts';
import { AnyElement, attributes, type Props } from './attribute-traits.ts';
import { trait } from './composition.ts';

export const TYPEABLE_ATTRS: Readonly<{ type: ConverterOf<string> }> = {
  type: Str,
};

/**
 * Element trait that exposes a string-backed nullable `type` field.
 */
@trait
@attributes(TYPEABLE_ATTRS)
export class Typeable extends AnyElement {
  accessor type!: string | null;
}

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
