// P16. A static attribute table on the trait class, and the members' types
// from an interface merged with the trait class that declares accessor
// signatures. Neither emits a member, so the module is valid JavaScript with
// no transform.
import { ControlledElement } from './element.ts';
import { Bool, Str, Traits, type AttributeTable } from './marker.ts';

export interface Disableable {
  get disabled(): boolean;
  set disabled(value: boolean);
}
export class Disableable extends ControlledElement {
  static readonly attributes: AttributeTable<Disableable> = { disabled: Bool };
}

/** A read-only attribute: a getter signature alone. */
export interface Busy {
  get busy(): boolean;
}
export class Busy extends ControlledElement {
  static readonly attributes: AttributeTable<Busy> = { busy: Bool };
}

export interface Wrong {
  get disabled(): boolean;
  set disabled(value: boolean);
}
export class Wrong extends ControlledElement {
  static readonly attributes: AttributeTable<Wrong> = {
    disabled: Str, // expected: an error
  };
}

export class Component extends Traits<[Disableable, Busy]> {
  enable(): void {
    this.disabled = false; // expected: ok
    this.busy = true; // expected: TS2540
  }
}
export class SubComponent extends Component {
  override get disabled(): boolean {
    return true; // expected: ok if the members keep the accessor kind
  }
  override set disabled(_value: boolean) {}
}
export class OwnField extends Traits<[Disableable]> {
  override disabled: boolean = false; // expected: TS2610 if the kind is kept
}
