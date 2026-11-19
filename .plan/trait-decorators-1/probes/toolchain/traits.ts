import attr, { Bool } from './attr.ts';
import { ControlledElement } from './element.ts';

const controls = new WeakMap<HTMLElement, HTMLElement>();

export class Disableable extends ControlledElement {
  get disabled(): boolean {
    return attr.get(this, 'disabled', Bool);
  }
  set disabled(value: boolean) {
    attr.set(this, 'disabled', value, Bool);
  }
}

export class FocusForwarding extends ControlledElement {
  override focus(options?: FocusOptions): void {
    controls.get(this)!.focus(options);
  }
}

export class CallsSuper extends ControlledElement {
  override focus(options?: FocusOptions): void {
    super.focus(options);
  }
}
