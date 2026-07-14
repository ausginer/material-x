import { Bool, type ConverterOf } from '@ydinjs/core/attribute.js';
import { trait, type Trait } from '@ydinjs/core/traits/attributes.js';

const $checkable: unique symbol = Symbol('Checkable');

export const CHECKABLE_ATTRS: Readonly<{ checked: ConverterOf<boolean> }> = {
  checked: Bool,
};

export const Checkable: Trait<{ checked: boolean }, typeof $checkable> = trait(
  CHECKABLE_ATTRS,
  $checkable,
);
