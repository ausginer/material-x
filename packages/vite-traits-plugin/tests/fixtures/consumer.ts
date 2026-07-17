import {
  impl,
  type TraitedConstructor,
} from '@ydinjs/core/traits/attributes.js';
import { Base } from './base.ts';
import { Checkable } from './checkable.ts';
import { Nameable } from './nameable.ts';

const FooBase: TraitedConstructor<
  Base,
  typeof Base,
  [typeof Checkable, typeof Nameable]
> = impl(Base, [Checkable, Nameable]);

export default class Foo extends FooBase {
  extra = 'here';
}
