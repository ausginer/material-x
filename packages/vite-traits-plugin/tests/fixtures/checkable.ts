import { Bool, type ConverterOf } from '@ydinjs/core/attribute.js';
import {
  attributes,
  AnyElement,
} from '@ydinjs/core/traits/attribute-traits.js';
import { trait } from '@ydinjs/core/traits/composition.js';

// A layer (b) trait whose table is a module constant.
export const CHECKABLE_ATTRS: Readonly<{ checked: ConverterOf<boolean> }> = {
  checked: Bool,
};

@trait
@attributes(CHECKABLE_ATTRS)
export class Checkable extends AnyElement {
  accessor checked!: boolean;
}
