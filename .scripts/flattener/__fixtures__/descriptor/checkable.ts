import { Bool, type ConverterOf } from 'ydin/attribute.js';
import { trait, type Trait } from 'ydin/traits/traits.js';

const $checkable: unique symbol = Symbol('Checkable');

export const CHECKABLE_ATTRS: Readonly<{ checked: ConverterOf<boolean> }> = {
  checked: Bool,
};

export const Checkable: Trait<{ checked: boolean }, typeof $checkable> = trait(
  CHECKABLE_ATTRS,
  $checkable,
);
