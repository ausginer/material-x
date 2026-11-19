// Core- and material-x-shaped traits on layer (a) alone: no layer (b). Each
// attribute is an explicit get/set pair calling core's operator, and each
// trait declares its own `static observedAttributes`.
import attr, {
  Bool,
  Str,
  type ConverterOf,
} from '../../../../../packages/core/src/attribute.ts';
import type { ControlledElement } from '../../../../../packages/core/src/element.ts';
import { bound, trait, type Bound } from '../layer-b/piirre.ts';

/** Bounds stay: they aren't attributes. */
export const AnyElement: Bound<HTMLElement> = bound();
export const Controlled: Bound<ControlledElement> = bound();

export class Disableable extends AnyElement {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly string[] = ['disabled'];
  get disabled(): boolean {
    return attr.get(this, 'disabled', Bool);
  }
  set disabled(value: boolean) {
    attr.set(this, 'disabled', value, Bool);
  }
}

export class Linkable extends AnyElement {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly string[] = ['href', 'target'];
  get href(): string | null {
    return attr.get(this, 'href', Str);
  }
  set href(value: string | null) {
    attr.set(this, 'href', value, Str);
  }
  get target(): string | null {
    return attr.get(this, 'target', Str);
  }
  set target(value: string | null) {
    attr.set(this, 'target', value, Str);
  }
}

export type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
export type ButtonSize = 'xsmall' | 'medium' | 'large' | 'xlarge';
const ButtonColorConverter = Str as ConverterOf<ButtonColor>;
const ButtonSizeConverter = Str as ConverterOf<ButtonSize>;

export class ButtonLike extends AnyElement {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly string[] = ['color', 'size'];
  get color(): ButtonColor | null {
    return attr.get(this, 'color', ButtonColorConverter);
  }
  set color(value: ButtonColor | null) {
    attr.set(this, 'color', value, ButtonColorConverter);
  }
  get size(): ButtonSize | null {
    return attr.get(this, 'size', ButtonSizeConverter);
  }
  set size(value: ButtonSize | null) {
    attr.set(this, 'size', value, ButtonSizeConverter);
  }
}
