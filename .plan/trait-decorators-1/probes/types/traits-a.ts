// Layer (a) traits for the probes. Each one declares what it requires of its
// base through a bound, or nothing.
import { ControlledElement } from './element.ts';
import { bound, trait, type Bound } from './layer-a.ts';

/** Bounds: written once, shared by the traits that need them. */
export const AnyElement: Bound<HTMLElement> = bound();
export const ObservedElement: Bound<
  HTMLElement,
  { readonly observedAttributes?: readonly string[] }
> = bound();
export const AnyControlled: Bound<ControlledElement> = bound();

/** No bound: applies to any class. It has a static, an associated function. */
export class Counted {
  static {
    trait(this);
  }
  static zero(): number {
    return 0;
  }
  count: number = 0; // RF-57's shape, for TS2611
}

/** Requires an element, and calls the element's members. */
export class Disableable extends AnyElement {
  static {
    trait(this);
  }
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }
}

/** Requires an element whose constructor has `observedAttributes`. */
export class Observing extends ObservedElement {
  static {
    trait(this);
  }
  static observed(): readonly string[] {
    return this.observedAttributes ?? []; // the static side sees the static bound
  }
}

/** Overrides a member of its bound, with a type brand. */
const controls = new WeakMap<object, HTMLElement>();
export class FocusForwarding extends AnyElement {
  static {
    trait(this);
  }
  #brand!: true;
  override focus(options?: FocusOptions): void {
    controls.get(this)?.focus(options);
  }
}

/** Requires ControlledElement, whose ES-private member makes it nominal. */
export class Internal extends AnyControlled {
  static {
    trait(this);
  }
  internalRole(): string | null {
    return this.internals.role;
  }
}

/** Rust-like: one required member and one provided member, no bound. */
export abstract class Labelled {
  static {
    trait(this);
  }
  abstract label(): string;
  describe(): string {
    return `[${this.label()}]`;
  }
}

/** A plain class that isn't an element: a base for the universality cases. */
export class Model {
  id: number = 1;
}
