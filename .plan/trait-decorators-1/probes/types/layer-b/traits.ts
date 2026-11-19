// Core- and material-x-shaped traits in the recommended layer (b) form: an
// `accessor` line types each attribute, and `attributes(this, { … })` in the
// static block holds its converter.
import {
  Bool,
  Str,
  type ConverterOf,
} from '../../../../../packages/core/src/attribute.ts';
import { trait } from './piirre.ts';
import { AnyElement, attributes, Controlled } from './ydin.ts';

export class Disableable extends AnyElement {
  static {
    trait(this);
    attributes(this, { disabled: Bool });
  }
  accessor disabled!: boolean;
}

export class Linkable extends AnyElement {
  static {
    trait(this);
    attributes(this, { href: Str, target: Str });
  }
  accessor href!: string | null;
  accessor target!: string | null;
}

export type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
export type ButtonSize = 'xsmall' | 'medium' | 'large' | 'xlarge';

export class ButtonLike extends AnyElement {
  static {
    trait(this);
    attributes(this, {
      color: Str as ConverterOf<ButtonColor>,
      size: Str as ConverterOf<ButtonSize>,
    });
  }
  accessor color!: ButtonColor | null;
  accessor size!: ButtonSize | null;
}

const controls = new WeakMap<HTMLElement, HTMLElement>();

/** Overrides a member its bound already has, so it carries a type brand. */
export class FocusForwarding extends Controlled {
  static {
    trait(this);
  }
  #brand!: true;
  override focus(options?: FocusOptions): void {
    controls.get(this)!.focus(options);
  }
}

export function useFocusForwarding(
  host: FocusForwarding,
  control: HTMLElement,
): void {
  controls.set(host, control);
}

/** An empty trait: only its brands. */
export class ButtonGroupLike extends Controlled {
  static {
    trait(this);
  }
  #brand!: true;
}
