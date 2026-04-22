import type { ControlledElement } from 'ydin/element.js';
import {
  DISABLEABLE_ATTRS,
  type Disableable,
} from 'ydin/traits/disableable.js';
import {
  impl,
  trait,
  type Interface,
  type Props,
  type Trait,
  type TraitedConstructor,
} from 'ydin/traits/traits.js';
import {
  ButtonCore,
  BUTTON_ATTRS,
  type ButtonLike,
} from '../button/ButtonCore.ts';
import { useCore } from '../core/utils/useCore.ts';
import {
  BUTTON_GROUP_CTX,
  useButtonGroupProvider,
} from './button-group-context.ts';

const $buttonGroupLike: unique symbol = Symbol('ButtonGroupLike');

export const ButtonGroupLike: Trait<{}, typeof $buttonGroupLike> = trait(
  {},
  $buttonGroupLike,
);

export type ButtonGroupLike = Interface<typeof ButtonGroupLike>;
export type ButtonGroupLikeProps = Props<typeof ButtonGroupLike>;

export const ButtonGroupCore: TraitedConstructor<
  ButtonCore,
  typeof ButtonCore,
  [typeof ButtonGroupLike]
> = impl(ButtonCore, [ButtonGroupLike]);
export type ButtonGroupCore = InstanceType<typeof ButtonGroupCore>;

export type ButtonGroupSharedCSSProperties = Readonly<{
  '--md-button-group-between-space'?: string;
  '--md-button-group-interaction-width-multiplier'?: string;
  '--md-button-group-inner-corner-size'?: string;
}>;

const BUTTON_CORE_ATTR_NAMES = Object.keys({
  ...BUTTON_ATTRS,
  ...DISABLEABLE_ATTRS,
});

export function useButtonGroupCore(
  host: ControlledElement & ButtonLike & ButtonGroupLike & Disableable,
  template: HTMLTemplateElement,
  aria: Partial<ARIAMixin>,
  styles: ReadonlyArray<CSSStyleSheet | string>,
): void {
  useCore(host, [template], aria, styles);
  useButtonGroupProvider(host, BUTTON_GROUP_CTX, BUTTON_CORE_ATTR_NAMES);
}
