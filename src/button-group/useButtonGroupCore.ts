import {
  ButtonCore,
  type ButtonLike,
  DEFAULT_BUTTON_ATTRIBUTES,
} from '../button/useButtonCore.ts';
import {
  useAttributes,
  type UpdateCallback,
} from '../core/controllers/useAttributes.ts';
import { useProvider } from '../core/controllers/useContext.ts';
import { EventEmitter } from '../core/elements/emitter.ts';
import {
  impl,
  trait,
  type Accessors,
  type ConstructorWithTraits,
  type Trait,
  type TraitProps,
} from '../core/elements/impl.ts';
import type { ReactiveElement } from '../core/elements/reactive-element.ts';
import type { Disableable } from '../core/traits/disableable.ts';
import { useCore } from '../core/utils/useCore.ts';
import {
  BUTTON_GROUP_CTX,
  type ChangedAttribute,
} from './button-group-context.ts';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const ButtonGroupLike: Trait<HTMLElement, Accessors<{}>> = trait({});
export type ButtonGroupLike = ButtonLike & TraitProps<typeof ButtonGroupLike>;

export const ButtonGroupCore: ConstructorWithTraits<
  ReactiveElement,
  [typeof ButtonLike, typeof Disableable, typeof ButtonGroupLike]
> = impl(ButtonCore, ButtonGroupLike);

export function useButtonGroupCore(
  host: ReactiveElement & ButtonGroupLike,
  template: HTMLTemplateElement,
  aria: Partial<ARIAMixin>,
  styles: CSSStyleSheet[],
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
