import {
  DEFAULT_BUTTON_ATTRIBUTES,
  type ButtonLike,
} from '../button/useButtonCore.ts';
import {
  useAttributes,
  type UpdateCallback,
} from '../core/controllers/useAttributes.ts';
import { useProvider } from '../core/controllers/useContext.ts';
import { EventEmitter } from '../core/elements/emitter.ts';
import { ReactiveElement } from '../core/elements/reactive-element.ts';
import { useCore } from '../core/utils/useCore.ts';
import {
  BUTTON_GROUP_CTX,
  type ChangedAttribute,
} from './button-group-context.ts';

export type ButtonGroupLike = ButtonLike;

const buttonGroups = new WeakSet<ReactiveElement>();

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

  buttonGroups.add(host);
}

export function isButtonGroupLike(value: unknown): value is ButtonGroupLike {
  return value instanceof ReactiveElement && buttonGroups.has(value);
}
