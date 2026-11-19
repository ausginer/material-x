import { ControlledElement } from './element.ts';

/** A descriptor-like trait: an accessor pair over an attribute. */
export class Disableable extends ControlledElement {
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }
}

const controls = new WeakMap<HTMLElement, HTMLElement>();

/** A method trait, as FocusForwarding is today. */
export class FocusForwarding extends ControlledElement {
  override focus(options?: FocusOptions): void {
    controls.get(this)!.focus(options);
  }
}

/** A trait with a class field: RF-57's shape. */
export class Counted extends ControlledElement {
  count: number = 0;
}

/** Two traits whose members conflict. */
export class NamedString extends ControlledElement {
  name: string = '';
}
export class NamedNumber extends ControlledElement {
  name: number = 0;
}
