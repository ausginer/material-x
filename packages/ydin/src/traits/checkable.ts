import { Bool } from '../attribute.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

const $checkable: unique symbol = Symbol('Checkable');

/**
 * Element trait that exposes a presence-based `checked` boolean field.
 */
export const Checkable: Trait<{ checked: boolean }, typeof $checkable> = trait(
  { checked: Bool },
  $checkable,
);

/**
 * Branded instance interface derived from {@link Checkable}.
 */
export type Checkable = Interface<typeof Checkable>;

/**
 * Framework-facing props derived from {@link Checkable}.
 */
export type CheckableProps = Props<typeof Checkable>;
