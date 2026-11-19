import { Str, type ConverterOf } from '@ydinjs/core/attribute.js';
import { useAttributes } from '@ydinjs/core/controllers/useAttributes.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import {
  AnyElement,
  attributes,
  type Props,
} from '@ydinjs/core/traits/attribute-traits.js';
import { trait } from '@ydinjs/core/traits/composition.js';
import type { Typeable } from '@ydinjs/core/traits/typeable.js';
import { switchState } from '@ydinjs/core/utils/DOM.js';
import type { EmptyObject } from 'type-fest';
import type { FocusForwarding } from '../core/traits/focus-forwarding.ts';
import type {
  ButtonCoreTraits,
  ButtonColor,
  ButtonCoreProps,
  ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import type {
  SwitchCoreTraits,
  SwitchEvents,
  SwitchProps,
} from './SwitchCore.ts';

export type IconButtonWidth = 'wide' | 'narrow';
export type IconButtonColor = Exclude<ButtonColor, 'text'> | 'standard';

/**
 * The icon button's own attribute, `width`. ButtonLike's accessor reads and
 * writes `color`; the member is declared here with the values both colors
 * share, which is the type an icon button's `color` has.
 */
export class IconButtonLike extends AnyElement {
  static {
    trait(this);
    attributes(this, { width: Str as ConverterOf<IconButtonWidth> });
  }

  accessor width!: IconButtonWidth | null;
  declare color: Extract<IconButtonColor, ButtonColor> | null;
}

export type IconButtonLikeProps = Omit<
  Props<typeof IconButtonLike>,
  'color'
> & {
  color?: IconButtonColor | null;
};

export type IconButtonCoreTraits = readonly [
  ...ButtonCoreTraits,
  typeof IconButtonLike,
  typeof Typeable,
  typeof FocusForwarding,
];

export type IconButtonProperties = Omit<ButtonCoreProps, 'color'> &
  IconButtonLikeProps;
export type IconButtonEvents = EmptyObject;
export type IconButtonCSSProperties = ButtonSharedCSSProperties;

export type SwitchIconButtonProperties = IconButtonProperties & SwitchProps;
export type SwitchIconButtonEvents = SwitchEvents;
export type SwitchIconButtonCSSProperties = ButtonSharedCSSProperties;

export type SwitchIconButtonCoreTraits = readonly [
  ...SwitchCoreTraits,
  typeof IconButtonLike,
];

export function useIconButtonCore(host: ControlledElement): void {
  useAttributes(host, {
    width: (oldValue, newValue) =>
      switchState(internals(host), oldValue, newValue),
  });
}
