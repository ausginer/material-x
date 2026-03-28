import {
  useAttributes,
  type UpdateCallback,
} from 'ydin/controllers/useAttributes.js';
import { useProvider } from 'ydin/controllers/useContext.js';
import type { ControlledElement } from 'ydin/element.js';
import { EventEmitter } from 'ydin/emitter.js';
import type { Disableable } from 'ydin/traits/disableable.js';
import {
  impl,
  trait,
  type TraitedConstructor,
  type Interface,
  type Props,
  type Trait,
} from 'ydin/traits/traits.js';
import {
  ButtonCore,
  DEFAULT_BUTTON_ATTRIBUTES,
  type ButtonLike,
} from '../button/ButtonCore.ts';
import { useCore } from '../core/utils/useCore.ts';
import {
  BUTTON_GROUP_CTX,
  type ChangedAttribute,
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

export function useButtonGroupCore(
  host: ControlledElement & ButtonLike & ButtonGroupLike & Disableable,
  template: HTMLTemplateElement,
  aria: Partial<ARIAMixin>,
  styles: ReadonlyArray<CSSStyleSheet | string>,
): void {
  useCore(host, [template], aria, styles);

  const emitter = new EventEmitter<ChangedAttribute>();

  useProvider(host, BUTTON_GROUP_CTX, { emitter, provider: host });

  useAttributes(
    host,
    Object.fromEntries(
      Object.entries(DEFAULT_BUTTON_ATTRIBUTES).map(
        ([attr, [from]]) =>
          [
            attr,
            ((oldValue, newValue) =>
              emitter.emit(
                attr,
                from(oldValue),
                from(newValue),
              )) satisfies UpdateCallback,
          ] as const,
      ),
    ),
  );
}
