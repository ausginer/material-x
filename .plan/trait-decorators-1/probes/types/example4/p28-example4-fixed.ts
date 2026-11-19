// P28. The fixed version (traits/fixed.ts), with P27's cases and the ones the
// fixes add. Each case states its expected result.
import { ControlledElement } from './element.ts';
import {
  AnyElement,
  bound,
  compose,
  Counted,
  Disableable,
  FocusForwarding,
  IconButton,
  ObservedElement,
  trait,
  type Bound,
  type Composed,
} from './traits/fixed.ts';

// (a) Kept from form E: override, TS2610, TS2611, the traits' statics.
const Base: Composed<
  typeof ControlledElement,
  [typeof Disableable, typeof FocusForwarding, typeof Counted]
> = compose(ControlledElement);
export class NoOverride extends Base {
  focus(): void {} // expected: TS4114
}
export class OwnField extends Base {
  override disabled = true; // expected: TS2610
}
export class OwnAccessor extends Base {
  override get count(): number {
    // expected: TS2611
    return 1;
  }
}
export const zero: number = IconButton.zero(); // expected: ok

// (b) fix 4: the base's own statics are kept.
export class StaticBase extends HTMLElement {
  static readonly formAssociated: boolean = true;
  static define(): void {}
}
const WithStatics: Composed<typeof StaticBase, [typeof Counted]> =
  compose(StaticBase);
export class FromStaticBase extends WithStatics {
  static override readonly formAssociated: boolean = false; // expected: ok
}
FromStaticBase.define(); // expected: ok
FromStaticBase.zero(); // expected: ok

// (c) fix 2: the bound is checked where the trait is applied.
const AnyControlled: Bound<ControlledElement> = bound(); // expected: ok, Bound is exported
export class Controlled extends AnyControlled {
  static {
    trait(this);
  }
  reconnect(): void {
    this.connectedCallback();
  }
}
export class Model {}
const OnHTMLElement: Composed<typeof HTMLElement, [typeof Controlled]> =
  compose(HTMLElement); // expected: TS2344, the instance bound is nominal
const OnModel: Composed<typeof Model, [typeof Disableable]> = compose(Model); // expected: TS2344
const OnControlled: Composed<typeof ControlledElement, [typeof Controlled]> =
  compose(ControlledElement); // expected: ok
export class FromHTMLElement extends OnHTMLElement {}
export class FromModel extends OnModel {}
export class FromControlled extends OnControlled {}

// (d) A static bound: met by a base with the static, not by one without.
export class Observing extends ObservedElement {
  static {
    trait(this);
  }
  static observed(): readonly string[] {
    return this.observedAttributes ?? [];
  }
}
export class ObservedBase extends HTMLElement {
  static readonly observedAttributes: readonly string[] = [];
}
const StaticMet: Composed<typeof ObservedBase, [typeof Observing]> =
  compose(ObservedBase); // expected: ok
// An HTMLElement meets the instance bound and lacks the static.
const StaticMissed: Composed<typeof HTMLElement, [typeof Observing]> =
  compose(HTMLElement); // expected: TS2344
export class FromStaticMet extends StaticMet {}
export class FromStaticMissed extends StaticMissed {}
FromStaticMet.observed(); // expected: ok

// (e) The base named twice: unchanged from P27.
const Narrower: Composed<typeof ControlledElement, [typeof Counted]> =
  compose(HTMLElement); // expected: TS2322
const Wider: Composed<typeof HTMLElement, [typeof Counted]> =
  compose(ControlledElement); // expected: ok, silently
export class FromNarrower extends Narrower {}
export class FromWider extends Wider {}

// (f) A supertrait: a trait class whose base composes a bound with traits. It
// carries the bound to its users, and its required member is checked.
const LabelledBase: Composed<typeof AnyElement, [typeof Disableable]> =
  compose(AnyElement);
export abstract class LabelledButton extends LabelledBase {
  static {
    trait(this);
  }
  abstract label(): string;
  describe(): string {
    return this.disabled ? '' : this.label();
  }
}
const Labelled: Composed<typeof ControlledElement, [typeof LabelledButton]> =
  compose(ControlledElement);
export class WithLabel extends Labelled {
  label(): string {
    return 'ok';
  }
  check(): boolean {
    return this.disabled; // expected: ok, through the supertrait
  }
}
export class WithoutLabel extends Labelled {} // expected: TS2515
const LabelledOnModel: Composed<typeof Model, [typeof LabelledButton]> =
  compose(Model); // expected: TS2344, the supertrait carries AnyElement
export class FromLabelledOnModel extends LabelledOnModel {}

// (g) instanceof narrows.
export function isOff(node: Node): boolean {
  return node instanceof Disableable && node.disabled; // expected: ok
}
