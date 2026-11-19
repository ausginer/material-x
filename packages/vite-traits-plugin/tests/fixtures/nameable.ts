import { Str } from '@ydinjs/core/attribute.js';
import {
  attributes,
  AnyElement,
} from '@ydinjs/core/traits/attribute-traits.js';
import { trait } from '@ydinjs/core/traits/composition.js';

// A layer (b) trait whose table is inline.
export class Nameable extends AnyElement {
  static {
    trait(this);
    attributes(this, { name: Str });
  }

  accessor name!: string | null;
}
