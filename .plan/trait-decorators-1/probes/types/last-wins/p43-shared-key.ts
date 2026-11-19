// P43. RD-26's shared key with each trait trimmed alone (trimmed.ts) against
// P40's form, which trims every earlier trait together (composition.ts). The
// traits copy material-x's button traits on the migration branch: IconButtonLike
// declares ButtonLike's `color` with the values both colors share, and
// FocusForwarding is nominal through an ES-private field. Each case states its
// expected result.
import { ControlledElement } from '../../../../../packages/core/src/element.ts';
import {
  bound,
  compose as composeTogether,
  trait,
  type Bound,
  type Composed as Together,
} from './composition.ts';
import { compose, type Composed } from './trimmed.ts';

const AnyElement: Bound<HTMLElement> = bound();
const Controlled: Bound<ControlledElement> = bound();

type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
type IconButtonColor = Exclude<ButtonColor, 'text'> | 'standard';

export class ButtonLike extends AnyElement {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly ('color' | 'size')[] = [
    'color',
    'size',
  ];
  accessor color!: ButtonColor | null;
  accessor size!: 'small' | 'medium' | null;
}

export class Disableable extends AnyElement {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly 'disabled'[] = ['disabled'];
  accessor disabled!: boolean;
}

export class Checkable extends AnyElement {
  static {
    trait(this);
  }
  accessor checked!: boolean;
}

export class FocusForwarding extends Controlled {
  static {
    trait(this);
  }
  // oxlint-disable-next-line no-unused-private-class-members
  readonly #brand!: true;
  override focus(_options?: FocusOptions): void {}
}

export class IconButtonLike extends AnyElement {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly 'width'[] = ['width'];
  accessor width!: 'wide' | 'narrow' | null;
  declare color: Extract<IconButtonColor, ButtonColor> | null;
}

type ButtonCore = InstanceType<
  Composed<typeof ControlledElement, [typeof ButtonLike, typeof Disableable]>
>;
declare function useButtonCore(host: ButtonCore & FocusForwarding): void;

// (a) SwitchIconButton's order, FocusForwarding before IconButtonLike.
const SwitchTogether: Together<
  typeof ControlledElement,
  [
    typeof ButtonLike,
    typeof Disableable,
    typeof Checkable,
    typeof FocusForwarding,
    typeof IconButtonLike,
  ]
> = composeTogether(ControlledElement);
export class SwitchIconButtonTogether extends SwitchTogether {
  check(): void {
    useButtonCore(this); // expected: TS2345 — Omit drops FocusForwarding's #brand
  }
}

const SwitchAlone: Composed<
  typeof ControlledElement,
  [
    typeof ButtonLike,
    typeof Disableable,
    typeof Checkable,
    typeof FocusForwarding,
    typeof IconButtonLike,
  ]
> = compose(ControlledElement);
export class SwitchIconButton extends SwitchAlone {
  check(): void {
    useButtonCore(this); // expected: ok — FocusForwarding declares no shared key and stays whole
    const c: 'outlined' | 'elevated' | 'tonal' | null = this.color; // expected: ok — IconButtonLike's color wins
    void c;
  }
  standard(): void {
    this.color = 'standard'; // expected: TS2322 — not a value both colors share
  }
  text(): void {
    this.color = 'text'; // expected: TS2322 — ButtonLike's color lost
  }
}
export const switchNames: readonly ('color' | 'size' | 'disabled' | 'width')[] =
  SwitchIconButton.observedAttributes; // expected: ok — the statics are unchanged

// (b) IconButton's order, FocusForwarding after IconButtonLike: both forms accept it.
const IconTogether: Together<
  typeof ControlledElement,
  [
    typeof ButtonLike,
    typeof Disableable,
    typeof IconButtonLike,
    typeof FocusForwarding,
  ]
> = composeTogether(ControlledElement);
export class IconButtonTogether extends IconTogether {
  check(): void {
    useButtonCore(this); // expected: ok
  }
}
const IconAlone: Composed<
  typeof ControlledElement,
  [
    typeof ButtonLike,
    typeof Disableable,
    typeof IconButtonLike,
    typeof FocusForwarding,
  ]
> = compose(ControlledElement);
export class IconButton extends IconAlone {
  check(): void {
    useButtonCore(this); // expected: ok
  }
}

// (c) The kind checks after a shared key. Trimmed alone, only the trait that
// loses the key goes through Omit.
export class OwnDisabledAlone extends IconAlone {
  override disabled = true; // expected: TS2610 — Disableable shares no key and keeps its kinds
}
export class OwnWidthAlone extends IconAlone {
  override width: 'wide' | 'narrow' | null = null; // expected: TS2610 — IconButtonLike's accessor, never trimmed
}
export class OwnSizeAlone extends IconAlone {
  override size: 'small' | 'medium' | null = null; // expected: ok — ButtonLike lost `color`, and went through Omit
}
export class OwnDisabledTogether extends IconTogether {
  override disabled = true; // expected: ok — P40's form trims Disableable with ButtonLike
}

// (d) What still goes: a nominal trait that loses a key loses its #brand.
export class Sized extends AnyElement {
  static {
    trait(this);
  }
  // oxlint-disable-next-line no-unused-private-class-members
  readonly #brand!: true;
  accessor size!: 'small' | null;
}
export class Large extends AnyElement {
  static {
    trait(this);
  }
  accessor size!: 'large' | null;
}
declare function useSized(host: Sized): void;
const SizedBase: Composed<
  typeof ControlledElement,
  [typeof Sized, typeof Large]
> = compose(ControlledElement);
export class SizedLarge extends SizedBase {
  check(): void {
    useSized(this); // expected: TS2345 — Sized lost `size`, and its #brand with it
    this.size = 'large'; // expected: ok — Large's size wins
  }
}

// (e) P40's other cases under the trimmed form.
const NoShared: Composed<
  typeof ControlledElement,
  [typeof ButtonLike, typeof Disableable]
> = compose(ControlledElement);
export class OwnColorNoShared extends NoShared {
  override color: ButtonColor | null = null; // expected: TS2610 — no shared key, the intersection keeps kinds
}
export class Declares extends IconAlone {
  declare color: 'outlined' | null; // expected: ok — the component's own declaration wins
}

// (f) TS2611 after a shared key: a trait that loses no key keeps its fields'
// kind, and IconButtonLike's `declare color`, a property, is the kind that wins.
export class Counted extends AnyElement {
  static {
    trait(this);
  }
  declare count: number;
}
const CountedIcon: Composed<
  typeof ControlledElement,
  [typeof ButtonLike, typeof Counted, typeof IconButtonLike]
> = compose(ControlledElement);
export class AccessorOverCount extends CountedIcon {
  override get count(): number {
    // expected: TS2611 — Counted shares no key and keeps its field
    return 0;
  }
}
export class AccessorOverColor extends CountedIcon {
  override get color(): 'outlined' | null {
    // expected: TS2611 — the winning member is IconButtonLike's declared property
    return null;
  }
  override set color(_value: 'outlined' | null) {}
}
