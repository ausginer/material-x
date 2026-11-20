import { useAttributes } from '@ydinjs/core/controllers/useAttributes.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import {
  Controlled,
  type Props,
} from '@ydinjs/core/traits/attribute-traits.js';
import { trait, type Composed } from '@ydinjs/core/traits/composition.js';
import { DISABLEABLE_ATTRS } from '@ydinjs/core/traits/disableable.js';
import {
  type Valuable,
  VALUABLE_ATTRS,
  type ValuableProps,
} from '@ydinjs/core/traits/valuable.js';
import { switchState } from '@ydinjs/core/utils/DOM.js';
import type { EmptyObject } from 'type-fest';
import {
  BUTTON_ATTRS,
  type ButtonCoreTraits,
  type ButtonCoreProps,
} from '../button/ButtonCore.ts';
import { useCore } from '../core/utils/useCore.ts';
import {
  BUTTON_GROUP_CTX,
  useButtonGroupProvider,
} from './button-group-context.ts';

@trait
export class ButtonGroupLike extends Controlled {
  // The field exists for its type: it makes the trait nominal, because its
  // members are its bound's.
  // eslint-disable-next-line @typescript-eslint/no-unused-private-class-members
  readonly #brand!: true;
}

export type ButtonGroupLikeProps = Props<typeof ButtonGroupLike>;

export type ButtonGroupCoreTraits = readonly [
  ...ButtonCoreTraits,
  typeof ButtonGroupLike,
  typeof Valuable,
];

export type ButtonGroupCore = InstanceType<
  Composed<typeof ControlledElement, ButtonGroupCoreTraits>
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
