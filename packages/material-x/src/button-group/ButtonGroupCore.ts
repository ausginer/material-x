import type { EmptyObject } from 'type-fest';
import { useAttributes } from 'ydin/controllers/useAttributes.js';
import { internals, type ControlledElement } from 'ydin/element.js';
import { DISABLEABLE_ATTRS } from 'ydin/traits/disableable.js';
import {
  trait,
  type Interface,
  type Props,
  type Trait,
  type Traited,
} from 'ydin/traits/traits.js';
import {
  Valuable,
  VALUABLE_ATTRS,
  type ValuableProps,
} from 'ydin/traits/valuable.js';
import { switchState } from 'ydin/utils/DOM.js';
import {
  BUTTON_ATTRS,
  BUTTON_CORE_TRAITS,
  type ButtonCoreProps,
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

export const BUTTON_GROUP_CORE_TRAITS: readonly [
  ...typeof BUTTON_CORE_TRAITS,
  typeof ButtonGroupLike,
  typeof Valuable,
] = [...BUTTON_CORE_TRAITS, ButtonGroupLike, Valuable];

export type ButtonGroupCore = Traited<
  ControlledElement,
  typeof BUTTON_GROUP_CORE_TRAITS
>;
export type ButtonGroupCoreEvents = EmptyObject;
export type ButtonGroupCoreProps = ButtonCoreProps & ValuableProps;

export type ButtonGroupCoreCSSProperties = Readonly<{
  '--md-button-group-between-space'?: string;
  '--md-button-group-interaction-width-multiplier'?: string;
  '--md-button-group-inner-corner-size'?: string;
}>;

const BUTTON_CORE_ATTR_NAMES = Object.keys({
  ...BUTTON_ATTRS,
  ...DISABLEABLE_ATTRS,
  ...VALUABLE_ATTRS,
});

export function useButtonGroupCore(
  host: ButtonGroupCore,
  template: HTMLTemplateElement,
  aria: Partial<ARIAMixin>,
  styles: ReadonlyArray<CSSStyleSheet | string>,
): void {
  useCore(host, [template], aria, styles);

  // The group forwards `size` to its child buttons through the context provider,
  // but the group's own per-size tokens (`between-space`, connected
  // `inner-corner`) live behind `:host(:state(<size>))` rules. Mirror `size`
  // onto the host as a custom state so those rules activate — the value is the
  // state name (e.g. `size="large"` → `:state(large)`); `small` is the default
  // and carries no attribute, matching the base `:host` rule.
  const innards = internals(host);
  useAttributes(host, {
    size: (oldValue, newValue) => switchState(innards, oldValue, newValue),
  });

  useButtonGroupProvider(host, BUTTON_GROUP_CTX, BUTTON_CORE_ATTR_NAMES);
}
