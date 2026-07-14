import { Bool } from '@ydinjs/core/attribute.js';
import {
  impl,
  trait,
  type Trait,
  type TraitedConstructor,
} from '@ydinjs/core/traits/attributes.js';
import { Base } from './base.ts';
import { CORE_TRAITS } from './core-traits.ts';
import { Nameable } from './nameable.ts';

const $local: unique symbol = Symbol('Local');

// A trait defined in the consumer module itself, with an inline attrs object
// and a private brand — linked in place, without an import (FAB-style).
export const Local: Trait<{ active: boolean }, typeof $local> = trait(
  { active: Bool },
  $local,
);

const FooBase: TraitedConstructor<
  Base,
  typeof Base,
  [...typeof CORE_TRAITS, typeof Nameable, typeof Local]
> = impl(Base, [...CORE_TRAITS, Nameable, Local]);

export default class Foo extends FooBase {
  extra = 'here';
}
