// P23. Layer (a): how a component names its base and its traits. Three
// candidates, each read with the same cases. The component chooses its base;
// nothing here is hard-wired to an element.
import { ControlledElement } from './element.ts';
import {
  compose,
  Traits,
  traitsFor,
  type Composed,
  type TraitsFor,
} from './layer-a.ts';
import {
  Counted,
  Disableable,
  Labelled,
  Model,
  Observing,
} from './traits-a.ts';

// ─── (i) The base as a type argument: Traits<typeof Base, [A, B]> ───────────

// (i.a) Members, and `override` on a trait accessor. expected: ok
export class I1 extends Traits<typeof ControlledElement, [typeof Disableable]> {
  check(): boolean {
    return this.disabled && this.isConnected; // expected: ok
  }
  override get disabled(): boolean {
    return true;
  }
  override set disabled(_value: boolean) {}
}
// (i.b) An own field over a trait accessor. expected: TS2610
export class I2 extends Traits<typeof ControlledElement, [typeof Disableable]> {
  override disabled: boolean = false;
}
// (i.c) A base static. expected: TS4113, because the static side is Traits's own
export class I3 extends Traits<typeof ControlledElement, [typeof Disableable]> {
  static override observedAttributes: readonly string[] = [];
}
// (i.d) A trait static. expected: TS2339
export const i4: number = I1.zero();
// (i.e) A trait whose bound the base doesn't meet. expected: TS2344
export class I5 extends Traits<typeof Model, [typeof Disableable]> {}

// ─── (ii) One annotated marker per base: ElementTraits<[A, B]> ──────────────

export const ElementTraits: TraitsFor<typeof ControlledElement> =
  traitsFor(ControlledElement);
export const ModelTraits: TraitsFor<typeof Model> = traitsFor(Model);

// (ii.a) Members, and `override`. expected: ok
export class E1 extends ElementTraits<[typeof Disableable, typeof Counted]> {
  check(): boolean {
    return this.disabled && this.count > 0; // expected: ok
  }
  override get disabled(): boolean {
    return true;
  }
  override set disabled(_value: boolean) {}
}
// (ii.b) An own field over a trait accessor. expected: TS2610
export class E2 extends ElementTraits<[typeof Disableable]> {
  override disabled: boolean = false;
}
// (ii.c) A base static. expected: ok
export class E3 extends ElementTraits<[typeof Disableable]> {
  static override observedAttributes: readonly string[] = [];
}
// (ii.d) A trait static. expected: TS2339
export const e4: number = E1.zero();
// (ii.e) A trait whose bound the base doesn't meet. expected: TS2344
export class E5 extends ModelTraits<[typeof Disableable]> {}
// (ii.f) A trait with no bound on a base that isn't an element. expected: ok
export class E6 extends ModelTraits<[typeof Counted]> {
  check(): number {
    return this.id + this.count; // expected: ok
  }
}
// (ii.g) RF-57: a subclass's accessor over a trait's field. expected: TS2611
export class E7 extends E1 {
  override get count(): number {
    return 1;
  }
  override set count(_value: number) {}
}

// ─── (iii) One annotated composition per component ──────────────────────────

// (iii.a) Members, `override`, a base static and a trait static. expected: ok
const C1Base: Composed<
  typeof ControlledElement,
  [typeof Disableable, typeof Counted]
> = compose(ControlledElement);
export class C1 extends C1Base {
  static override observedAttributes: readonly string[] = [];
  check(): boolean {
    return this.disabled && this.count > 0; // expected: ok
  }
  override get disabled(): boolean {
    return true;
  }
  override set disabled(_value: boolean) {}
}
export const c1: number = C1.zero(); // expected: ok

// (iii.b) An own field over a trait accessor. expected: TS2610
const C2Base: Composed<typeof ControlledElement, [typeof Disableable]> =
  compose(ControlledElement);
export class C2 extends C2Base {
  override disabled: boolean = false;
}

// (iii.c) RF-57: a subclass's accessor over a trait's field. expected: TS2611
export class C3 extends C1 {
  override get count(): number {
    return 1;
  }
  override set count(_value: number) {}
}

// (iii.d) A trait whose instance bound the base doesn't meet. expected: TS2344
const C4Base: Composed<typeof Model, [typeof Disableable]> = compose(Model);
export class C4 extends C4Base {}

// (iii.e) A trait whose static bound the base doesn't meet: HTMLElement's
// instances meet Observing's instance bound, and its constructor has no
// `observedAttributes`. expected: TS2344
const C5Base: Composed<typeof HTMLElement, [typeof Observing]> =
  compose(HTMLElement);
export class C5 extends C5Base {}

// (iii.f) A trait with no bound on a base that isn't an element. expected: ok
const C6Base: Composed<typeof Model, [typeof Counted, typeof Labelled]> =
  compose(Model);
export class C6 extends C6Base {
  override label(): string {
    return `${this.id}:${this.count}`; // expected: ok
  }
}

// (iii.g) The call names another base than the annotation: a superclass of
// the annotation's base. expected: unknown. Observed: ok, so the two names of
// the base can disagree in this direction, and the flattener has to compare them
const C7Base: Composed<typeof ControlledElement, [typeof Disableable]> =
  compose(HTMLElement);
export class C7 extends C7Base {}

// (iii.h) The call names an unrelated base. expected: an error
const C8Base: Composed<typeof ControlledElement, [typeof Disableable]> =
  compose(Model);
export class C8 extends C8Base {}

// (iii.i) The call with no annotation. expected: TS9010
const C9Base = compose(ControlledElement);
export class C9 extends C9Base {}
