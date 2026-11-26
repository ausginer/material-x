import { Bool, type ConverterOf } from '../attribute.ts';
import { AnyElement, attributes, type Props } from './attribute-traits.ts';
import { trait } from './composition.ts';

export const SELECTABLE_ATTRS: Readonly<{ selected: ConverterOf<boolean> }> = {
  selected: Bool,
};

/**
 * Element trait that exposes a presence-based `selected` boolean field.
 */
@trait
@attributes(SELECTABLE_ATTRS)
export class Selectable extends AnyElement {
  accessor selected!: boolean;
}

/**
 * Framework-facing props derived from {@link Selectable}.
 */
export type SelectableProps = Props<typeof Selectable>;
