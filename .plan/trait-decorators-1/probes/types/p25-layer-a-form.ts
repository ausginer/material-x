// P25. The recommended layer (a) form with no error case, so that its
// declarations are emitted and the language service can be read on it.
import { ControlledElement } from './element.ts';
import { compose, type Composed } from './layer-a.ts';
import { Counted, Disableable, FocusForwarding } from './traits-a.ts';

export type ButtonCoreTraits = readonly [
  typeof Disableable,
  typeof FocusForwarding,
];

const IconButtonBase: Composed<
  typeof ControlledElement,
  [...ButtonCoreTraits, typeof Counted]
> = compose(ControlledElement);

export class IconButton extends IconButtonBase {
  static override observedAttributes: readonly string[] = ['disabled'];

  check(): boolean {
    return this.disabled && this.count === IconButton.zero();
  }

  override focus(options?: FocusOptions): void {
    this.disabled = false;
    super.focus(options); // typechecks; the flattener rejects super.<trait key>
  }
}
