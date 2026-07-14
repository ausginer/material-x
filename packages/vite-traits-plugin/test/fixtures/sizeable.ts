import { Str, type ConverterOf } from '@ydinjs/core/attribute.js';
import { trait, type Trait } from '@ydinjs/core/traits/attributes.js';

const $sizeable: unique symbol = Symbol('Sizeable');

export const SIZEABLE_ATTRS: Readonly<{ size: ConverterOf<string> }> = {
  size: Str,
};

export const Sizeable: Trait<{ size: string | null }, typeof $sizeable> = trait(
  SIZEABLE_ATTRS,
  $sizeable,
);
