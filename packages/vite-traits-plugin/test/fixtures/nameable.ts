import { Str, type ConverterOf } from '@ydinjs/core/attribute.js';
import { trait, type Trait } from '@ydinjs/core/traits/attributes.js';

const $nameable: unique symbol = Symbol('Nameable');

export const NAMEABLE_ATTRS: Readonly<{ name: ConverterOf<string> }> = {
  name: Str,
};

export const Nameable: Trait<{ name: string | null }, typeof $nameable> = trait(
  NAMEABLE_ATTRS,
  $nameable,
);
