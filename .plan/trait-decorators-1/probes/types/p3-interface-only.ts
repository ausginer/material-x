// P3. Form B: the merged interface is the marker; there is no decorator.
// A shared trait group is an interface too, and erases.
import { ControlledElement } from './element.ts';
import { Disableable, FocusForwarding } from './traits.ts';

export class ButtonLike extends ControlledElement {
  get color(): string | null {
    return this.getAttribute('color');
  }
  set color(value: string | null) {
    if (value === null) this.removeAttribute('color');
    else this.setAttribute('color', value);
  }
}

/** A shared group, as BUTTON_CORE_TRAITS is today. */
export interface ButtonCore extends ButtonLike, Disableable {}

export function useButtonCore(host: ButtonCore): string | null {
  return host.disabled ? null : host.color; // expected: ok
}

export interface IconButton extends ButtonCore, FocusForwarding {}
export class IconButton extends ControlledElement {
  connectedCallback(): void {
    useButtonCore(this); // expected: ok
    this.focus();
  }
}
