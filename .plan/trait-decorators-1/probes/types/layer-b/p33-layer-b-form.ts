// P33. The recommended layers (a) and (b) together, with no error case: a
// component on core's real ControlledElement. Its declarations are printed.
import {
  ControlledElement,
  type ControlledElementConstructor,
} from '../../../../../packages/core/src/element.ts';
import { compose, type Composed } from './piirre.ts';
import {
  ButtonLike,
  Disableable,
  FocusForwarding,
  useFocusForwarding,
} from './traits.ts';
import type { Props } from './ydin.ts';

export type ButtonCoreTraits = readonly [typeof ButtonLike, typeof Disableable];

const ButtonBase: Composed<
  ControlledElementConstructor,
  [...ButtonCoreTraits, typeof FocusForwarding]
> = compose(ControlledElement);

export class Button extends ButtonBase {
  static override formAssociated: boolean = true;
  static override observedAttributes: readonly string[] = ['aria-label'];

  constructor() {
    super();
    useFocusForwarding(this, document.createElement('button'));
  }

  get tonal(): boolean {
    return this.color === 'tonal' && !this.disabled;
  }
}

export type ButtonProperties = Props<ButtonCoreTraits>;
