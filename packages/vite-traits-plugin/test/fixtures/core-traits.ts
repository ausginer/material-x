import { Str, type ConverterOf } from '@ydinjs/core/attribute.js';
import { trait, type Trait } from '@ydinjs/core/traits/attributes.js';
import { Checkable } from './checkable.ts';
import { Sizeable } from './sizeable.ts';

const $groupable: unique symbol = Symbol('Groupable');

export const GROUPABLE_ATTRS: Readonly<{ group: ConverterOf<string> }> = {
  group: Str,
};

// A trait DEFINED in this intermediate module (private brand + named attrs),
// then spread into the shared list below — mirroring material-x's `ButtonLike`
// living inside `ButtonCore` alongside `BUTTON_CORE_TRAITS`. Its brand/attrs
// must be linked THROUGH this module from a consumer that reaches it via the
// list, never treated as in the consumer's own scope.
export const Groupable: Trait<{ group: string | null }, typeof $groupable> =
  trait(GROUPABLE_ATTRS, $groupable);

// A shared, exported trait-list const referenced (and spread) by consumers,
// mirroring material-x's `*_CORE_TRAITS` arrays.
export const CORE_TRAITS: readonly [
  typeof Groupable,
  typeof Sizeable,
  typeof Checkable,
] = [Groupable, Sizeable, Checkable];
