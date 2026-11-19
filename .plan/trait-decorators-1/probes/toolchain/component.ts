import { ControlledElement, traits } from './element.ts';
import { Disableable, FocusForwarding } from './traits.ts';
import { attr, Bool } from './attr.ts';

export interface Button extends Disableable, FocusForwarding {}
@traits(Disableable, FocusForwarding)
export class Button extends ControlledElement {
  @attr(Bool) accessor pressed!: boolean;
  check(): boolean {
    return this.disabled;
  }
}
