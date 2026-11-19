// P35. Layer (a) alone: attributes as explicit get/set pairs and a static
// observedAttributes per trait, with core's real ControlledElement and
// operator. Each case states its expected result.
import attr, {
  Bool,
  Num,
  Str,
} from '../../../../../packages/core/src/attribute.ts';
import { ControlledElement } from '../../../../../packages/core/src/element.ts';
import type { AbstractConstructor } from 'type-fest';
import { compose, trait, type Composed } from '../layer-b/piirre.ts';
import { AnyElement, ButtonLike, Disableable, Linkable } from './traits.ts';

// (a) The override checks hold: an own field over an attribute, a subclass
// override of one, and writes.
const Base: Composed<
  typeof ControlledElement,
  [typeof Disableable, typeof Linkable, typeof ButtonLike]
> = compose(ControlledElement);
export class Writes extends Base {
  check(): boolean {
    this.href = null; // expected: ok
    this.color = 'tonal'; // expected: ok
    return this.disabled; // expected: ok
  }
}
export class OwnField extends Base {
  override disabled = true; // expected: TS2610
}
export class SubclassOverride extends Writes {
  override get href(): string | null {
    return null; // expected: ok
  }
  override set href(_value: string | null) {}
}

// (b) The converter is checked through the accessor's own type.
export class WrongConverter extends AnyElement {
  get disabled(): boolean {
    return attr.get(this, 'disabled', Str); // expected: TS2322, string | null is not boolean
  }
  set disabled(value: boolean) {
    attr.set(this, 'disabled', value, Str); // expected: TS2345, boolean is not string
  }
}
export class WrongSetterConverter extends AnyElement {
  get count(): number | null {
    return attr.get(this, 'count', Num); // expected: ok
  }
  set count(value: number | null) {
    attr.set(this, 'count', value, Bool); // expected: TS2345, number | null is not boolean
  }
}

// (c) The attribute's name is unchecked text: a misspelling, or the getter and
// the setter naming two attributes, compiles.
export class Misspelt extends AnyElement {
  get disabled(): boolean {
    return attr.get(this, 'disabld', Bool); // expected: ok — unchecked
  }
  set disabled(value: boolean) {
    attr.set(this, 'disabled', value, Bool); // expected: ok — unchecked
  }
}

// (d) observedAttributes is unchecked against the accessors: a missing name,
// and a name with no accessor, compile.
export class Unobserved extends AnyElement {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly string[] = ['hreff']; // expected: ok — unchecked
  get href(): string | null {
    return attr.get(this, 'href', Str);
  }
  set href(value: string | null) {
    attr.set(this, 'href', value, Str);
  }
}

// (e) Every attribute trait supplies the static key observedAttributes, and
// Statics<T> intersects them with no error: the component's type has one
// readonly string[], and nothing in the types merges the lists.
export const merged: readonly string[] = Base.observedAttributes; // expected: ok
// Question 8's rule, two traits supplying one key, has to exempt it.

// (f) A component's own static observedAttributes over the traits' lists.
export class OwnObserved extends Base {
  static override readonly observedAttributes: readonly string[] = [
    'aria-label',
  ]; // expected: ok in the types; at runtime it replaces the traits' lists unless the flattener merges it
}

// (g) Props are still derivable: an attribute is a non-method member that
// isn't an HTMLElement member, and get/set pairs are such members.
type AttributeKeys<T> = {
  [K in keyof T]-?: K extends keyof HTMLElement
    ? never
    : T[K] extends (...args: never[]) => unknown
      ? never
      : K;
}[keyof T];
type Props<T> =
  T extends AbstractConstructor<infer I>
    ? { [K in AttributeKeys<I>]?: I[K] }
    : never;
export const props: Props<typeof ButtonLike> = { color: 'tonal', size: null }; // expected: ok
export const badProps: Props<typeof Disableable> = { disabled: 'yes' }; // expected: TS2322

// (h) RF-57's shape: an accessor over a trait field still fails.
export class Counted {
  static {
    trait(this);
  }
  count: number = 0;
}
const WithField: Composed<typeof ControlledElement, [typeof Counted]> =
  compose(ControlledElement);
export class AccessorOverField extends WithField {
  override get count(): number {
    // expected: TS2611
    return 0;
  }
}
