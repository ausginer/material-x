import { Str, type ConverterOf } from 'ydin/attribute.js';
import { trait, type Trait } from 'ydin/traits/traits.js';

const $nameable: unique symbol = Symbol('Nameable');

export const NAMEABLE_ATTRS: Readonly<{ name: ConverterOf<string> }> = {
  name: Str,
};

export const Nameable: Trait<{ name: string | null }, typeof $nameable> = trait(
  NAMEABLE_ATTRS,
  $nameable,
);
