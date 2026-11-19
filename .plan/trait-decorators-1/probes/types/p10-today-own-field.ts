// P10. Today's form, for comparison with P6 (d): a component's own field over
// a trait accessor. Reads @ydinjs/core's built declarations.
import {
  ControlledElement,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import {
  impl,
  type TraitedConstructor,
} from '@ydinjs/core/traits/attributes.js';
import { Disableable } from '@ydinjs/core/traits/disableable.js';

const Base: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  [typeof Disableable]
> = impl(ControlledElement, [Disableable]);

export class OwnField extends Base {
  override disabled: boolean = false; // expected: unknown
}
