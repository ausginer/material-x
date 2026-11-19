// P27. The owner's _example4.ts as written (traits/_example4.ts, a byte copy),
// under experimentalDecorators. Each case states its expected result.
import { ControlledElement } from './element.ts';
import {
  AnyElement,
  bound,
  compose,
  Counted,
  Disableable,
  FocusForwarding,
  IconButton,
  trait,
  type Composed,
} from './traits/_example4.ts';

// (a) What form E kept: `override` on a trait member, TS2610 and TS2611 on
// trait members, and the traits' statics.
const Base: Composed<
  typeof ControlledElement,
  [typeof Disableable, typeof FocusForwarding, typeof Counted]
> = compose(ControlledElement);
export class NoOverride extends Base {
  focus(): void {} // expected: TS4114
}
export class OwnField extends Base {
  disabled = true; // expected: TS2610
}
export class OwnAccessor extends Base {
  get count(): number {
    // expected: TS2611
    return 1;
  }
}
export const zero: number = IconButton.zero(); // expected: ok

// (b) The base's own statics. Real ControlledElement declares no public
// static, so nothing is lost on IconButton. A base that has statics:
export class StaticBase extends HTMLElement {
  static readonly formAssociated: boolean = true;
  static define(): void {}
}
const WithStatics: Composed<typeof StaticBase, [typeof Counted]> =
  compose(StaticBase);
export class FromStaticBase extends WithStatics {
  static override readonly formAssociated: boolean = false; // expected: TS4113
}
FromStaticBase.define(); // expected: TS2339

// (c) The bound check without Applicable. A trait that requires
// ControlledElement, applied to a plain HTMLElement and to a non-element.
// The file doesn't export `Bound`, so a bound declared outside it can't be
// annotated. expected: TS9010 under isolatedDeclarations
const AnyControlled = bound<ControlledElement>();
@trait
export class Controlled extends AnyControlled {
  reconnect(): void {
    this.connectedCallback();
  }
}
const OnHTMLElement: Composed<typeof HTMLElement, [typeof Controlled]> =
  compose(HTMLElement); // expected: TS2344 if the bound were checked
export class Model {}
const OnModel: Composed<typeof Model, [typeof Disableable]> = compose(Model); // expected: TS2344 if the bound were checked
export class Plain extends OnHTMLElement {
  // the base is a plain HTMLElement, yet ControlledElement's member types:
  check(): void {
    this.connectedCallback();
  }
}
export class PlainModel extends OnModel {
  check(): boolean {
    return this.hasAttribute('x'); // a Model with HTMLElement's members
  }
}

// (d) The base named twice. compose's B comes from its argument and the
// annotation's B must accept it.
const Narrower: Composed<typeof ControlledElement, [typeof Counted]> =
  compose(HTMLElement); // expected: TS2322, the call names a superclass
const Wider: Composed<typeof HTMLElement, [typeof Counted]> =
  compose(ControlledElement); // expected: ok, silently, the call names a subclass
export class FromNarrower extends Narrower {}
export class FromWider extends Wider {}

// (e) The trait list comes from the annotation alone: no annotation, no list.
// expected: TS9010, and then TS2339
const Unannotated = compose(ControlledElement);
export class FromUnannotated extends Unannotated {
  check(): boolean {
    return this.disabled; // expected: TS2339
  }
}

// (f) instanceof on a trait class narrows to its instance type.
export function isOff(node: Node): boolean {
  return node instanceof Disableable && node.disabled; // expected: ok
}
void AnyElement;
