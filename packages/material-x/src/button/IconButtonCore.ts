import type { EmptyObject } from 'type-fest';
import { Str, type ConverterOf } from 'ydin/attribute.js';
import { useAttributes } from 'ydin/controllers/useAttributes.js';
import { internals, type ControlledElement } from 'ydin/element.js';
import {
  impl,
  trait,
  type Interface,
  type Props,
  type Trait,
  type TraitedConstructor,
} from 'ydin/traits/traits.js';
import { switchState } from 'ydin/utils/DOM.js';
import {
  ButtonCore,
  type ButtonColor,
  type ButtonCoreProps,
  type ButtonLike,
  type ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import {
  SwitchCore,
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

export const IconButtonCore: TraitedConstructor<
  ButtonCore,
  typeof ButtonCore,
  [typeof IconButtonLike]
> = impl(ButtonCore, [IconButtonLike]);

export type IconButtonProperties = Omit<ButtonCoreProps, 'color'> &
  IconButtonLikeProps;
export type IconButtonEvents = EmptyObject;
export type IconButtonCSSProperties = ButtonSharedCSSProperties;

export type SwitchIconButtonProperties = IconButtonProperties & SwitchProps;
export type SwitchIconButtonEvents = SwitchEvents;
export type SwitchIconButtonCSSProperties = ButtonSharedCSSProperties;

export const SwitchIconButtonCore: TraitedConstructor<
  SwitchCore,
  typeof SwitchCore,
  [typeof IconButtonLike]
> = impl(SwitchCore, [IconButtonLike]);

export function useIconButtonCore(host: ControlledElement): void {
  useAttributes(host, {
    width: (oldValue, newValue) =>
      switchState(internals(host), oldValue, newValue),
  });
}
