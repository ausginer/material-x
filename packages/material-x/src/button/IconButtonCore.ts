import { Str, type ConverterOf } from '@ydinjs/core/attribute.js';
import { useAttributes } from '@ydinjs/core/controllers/useAttributes.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import {
  trait,
  type Interface,
  type Props,
  type Trait,
} from '@ydinjs/core/traits/attributes.js';
import { Typeable } from '@ydinjs/core/traits/typeable.js';
import { switchState } from '@ydinjs/core/utils/DOM.js';
import type { EmptyObject } from 'type-fest';
import {
  BUTTON_CORE_TRAITS,
  type ButtonColor,
  type ButtonCoreProps,
  type ButtonLike,
  type ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import {
  SWITCH_CORE_TRAITS,
  type SwitchEvents,
  type SwitchProps,
} from './SwitchCore.ts';

export type IconButtonWidth = 'wide' | 'narrow';
export type IconButtonColor = Exclude<ButtonColor, 'text'> | 'standard';

type IconButtonLikeDescriptor = {
  width: IconButtonWidth | null;
  color: IconButtonColor | null;
};

const $iconButtonLike: unique symbol = Symbol('IconButtonLike');

export const IconButtonLike: Trait<
  IconButtonLikeDescriptor,
  typeof $iconButtonLike
> = trait(
  { width: Str as ConverterOf<IconButtonWidth> },
  $iconButtonLike,
  // enforcing the `color` here to override `ButtonCore`'s color.
) as Trait<IconButtonLikeDescriptor, typeof $iconButtonLike>;

export type IconButtonLike = Omit<ButtonLike, 'color'> &
  Interface<typeof IconButtonLike>;

export type IconButtonLikeProps = Props<typeof IconButtonLike>;

export const ICON_BUTTON_CORE_TRAITS: readonly [
  ...typeof BUTTON_CORE_TRAITS,
  typeof IconButtonLike,
  typeof Typeable,
] = [...BUTTON_CORE_TRAITS, IconButtonLike, Typeable];

export type IconButtonProperties = Omit<ButtonCoreProps, 'color'> &
  IconButtonLikeProps;
export type IconButtonEvents = EmptyObject;
export type IconButtonCSSProperties = ButtonSharedCSSProperties;

export type SwitchIconButtonProperties = IconButtonProperties & SwitchProps;
export type SwitchIconButtonEvents = SwitchEvents;
export type SwitchIconButtonCSSProperties = ButtonSharedCSSProperties;

export const SWITCH_ICON_BUTTON_CORE_TRAITS: readonly [
  ...typeof SWITCH_CORE_TRAITS,
  typeof IconButtonLike,
] = [...SWITCH_CORE_TRAITS, IconButtonLike];

export function useIconButtonCore(host: ControlledElement): void {
  useAttributes(host, {
    width: (oldValue, newValue) =>
      switchState(internals(host), oldValue, newValue),
  });
}
