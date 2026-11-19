// P1. A standard class decorator doesn't change the class's type.
import { ControlledElement, traits } from './element.ts';
import { Disableable } from './traits.ts';

@traits(Disableable)
export class Button extends ControlledElement {
  check(): boolean {
    return this.disabled; // expected: TS2339, 'disabled' doesn't exist
  }
}
