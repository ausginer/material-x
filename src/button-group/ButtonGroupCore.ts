/* eslint-disable @typescript-eslint/no-empty-object-type */
import {
  ButtonCore,
  DEFAULT_BUTTON_ATTRIBUTES,
  type ButtonLike,
} from '../button/ButtonCore.ts';
import {
  useAttributes,
  type UpdateCallback,
} from '../core/controllers/useAttributes.ts';
import { useProvider } from '../core/controllers/useContext.ts';
import { EventEmitter } from '../core/elements/emitter.ts';
import type { ReactiveElement } from '../core/elements/reactive-element.ts';
import {
  impl,
  trait,
  type ConstructorWithTraits,
  type Interface,
  type Props,
  type Trait,
  type Traits,
} from '../core/elements/traits.ts';
import type { Disableable } from '../core/traits/disableable.ts';
import { useCore } from '../core/utils/useCore.ts';
import {
  BUTTON_GROUP_CTX,
  type ChangedAttribute,
} from './button-group-context.ts';

type ButtonGroupLikeDescriptor = {};

const $buttonGroupLike: unique symbol = Symbol('ButtonGroupLike');

export const ButtonGroupLike: Trait<
  ButtonGroupLikeDescriptor,
  typeof $buttonGroupLike
> = trait<ButtonGroupLikeDescriptor, typeof $buttonGroupLike>(
  {},
  $buttonGroupLike,
);

export type ButtonGroupLike = Interface<typeof ButtonGroupLike>;
export type ButtonGroupLikeProps = Props<typeof ButtonGroupLike>;

export const ButtonGroupCore: ConstructorWithTraits<
  InstanceType<typeof ButtonCore>,
  [...Traits<typeof ButtonCore>, typeof ButtonGroupLike]
> = impl(ButtonCore, [ButtonGroupLike]);

export function useButtonGroupCore(
  host: ReactiveElement & ButtonLike & ButtonGroupLike & Disableable,
  template: HTMLTemplateElement,
  aria: Partial<ARIAMixin>,
  styles: ReadonlyArray<CSSStyleSheet | string>,
): void {
  useCore(host, template, aria, styles);

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
              emitter.emit({
                attr,
                old: from(oldValue),
                new: from(newValue),
              })) satisfies UpdateCallback,
          ] as const,
      ),
    ),
  );
}
