// P32. A component in layer (b): observedAttributes, props, brands and bounds,
// with core's real ControlledElement. Each case states its expected result.
import {
  Str,
  type ConverterOf,
} from '../../../../../packages/core/src/attribute.ts';
import {
  ControlledElement,
  type ControlledElementConstructor,
  type CustomElementStatics,
} from '../../../../../packages/core/src/element.ts';
import { bound, compose, trait, type Bound, type Composed } from './piirre.ts';
import {
  ButtonLike,
  Disableable,
  FocusForwarding,
  useFocusForwarding,
  type ButtonSize,
} from './traits.ts';
import { AnyElement, attributes, type Props } from './ydin.ts';

// (a) The component's own observedAttributes. ControlledElement declares none.
const Base: Composed<
  typeof ControlledElement,
  [typeof Disableable, typeof FocusForwarding]
> = compose(ControlledElement);
export class OwnObserved extends Base {
  static observedAttributes: readonly string[] = ['aria-label']; // expected: ok
}
export class OverrideObserved extends Base {
  static override observedAttributes: readonly string[] = []; // expected: TS4113
}
export class ObservingBase extends ControlledElement {
  static observedAttributes: readonly string[] = ['dir'];
}
const FromObserving: Composed<typeof ObservingBase, [typeof Disableable]> =
  compose(ObservingBase);
export class NoOverrideObserved extends FromObserving {
  static observedAttributes: readonly string[] = []; // expected: TS4114
}

// (b) The base as ControlledElementConstructor, so `formAssociated` keeps
// today's `override`.
const AsConstructor: Composed<
  ControlledElementConstructor,
  [typeof Disableable]
> = compose(ControlledElement); // expected: ok
export class FormAssociated extends AsConstructor {
  static override formAssociated: boolean = true; // expected: ok if (b) holds
}
export class FormAssociatedPlain extends Base {
  static formAssociated: boolean = true; // expected: ok, no override
}

// (c) Props.
export const disableable: Props<typeof Disableable> = { disabled: true }; // expected: ok
export const forwarding: Props<typeof FocusForwarding> = {}; // expected: ok
export const button: Props<[typeof ButtonLike, typeof Disableable]> = {
  color: 'tonal',
  disabled: true,
}; // expected: ok
export const wrongValue: Props<typeof ButtonLike> = { color: 'pink' }; // expected: TS2322
export const notAProp: Props<typeof Disableable> = { focus: 1 }; // expected: TS2353

// (d) Brands: FocusForwarding's members are its bound's, so only #brand makes
// it nominal.
export class Plain extends ControlledElement {}
export class Forwarding extends Base {}
useFocusForwarding(new Forwarding(), document.body); // expected: ok
useFocusForwarding(new Plain(), document.body); // expected: TS2741 or TS2345
export class Unbranded extends AnyElement {
  static {
    trait(this);
  }
  override focus(): void {}
}
export function useUnbranded(_host: Unbranded): void {}
useUnbranded(new Plain()); // expected: no error, any element passes

// (e) Bounds. FocusForwarding requires a ControlledElement; Disableable any
// element. A bound that names CustomElementStatics rejects ControlledElement.
const OnHTMLElement: Composed<typeof HTMLElement, [typeof FocusForwarding]> =
  compose(HTMLElement); // expected: TS2344
const DisableableOnHTMLElement: Composed<
  typeof HTMLElement,
  [typeof Disableable]
> = compose(HTMLElement); // expected: ok
export class FromHTMLElement extends OnHTMLElement {}
export class DisableableElement extends DisableableOnHTMLElement {}
const WithStatics: Bound<ControlledElement, CustomElementStatics> = bound();
export class NeedsStatics extends WithStatics {
  static {
    trait(this);
  }
}
const OnControlled: Composed<typeof ControlledElement, [typeof NeedsStatics]> =
  compose(ControlledElement); // expected: TS2344, the weak-type rule
export class FromControlled extends OnControlled {}
// Annotated with ControlledElementConstructor, which declares those statics,
// the same base meets that bound.
const OnConstructor: Composed<
  ControlledElementConstructor,
  [typeof NeedsStatics]
> = compose(ControlledElement); // expected: ok
export class FromConstructor extends OnConstructor {}

// (f) Q8: two traits with one attribute of different types. No error; the
// member narrows to the common values.
export type FABSize = 'small' | 'large';
export class FABLike extends AnyElement {
  static {
    trait(this);
    attributes(this, { size: Str as ConverterOf<FABSize> });
  }
  accessor size!: FABSize | null;
}
const Both: Composed<
  typeof ControlledElement,
  [typeof ButtonLike, typeof FABLike]
> = compose(ControlledElement);
export class Conflict extends Both {
  check(): ButtonSize | null {
    this.size = 'medium'; // expected: TS2322, only 'large' | null is left
    return this.size; // expected: ok
  }
}
