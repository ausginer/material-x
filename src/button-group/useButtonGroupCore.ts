import {
  DEFAULT_BUTTON_ATTRIBUTES,
  type ButtonLike,
} from '../button/useButtonCore.ts';
import { useAttribute } from '../core/controllers/useAttribute.ts';
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

  Object.entries(DEFAULT_BUTTON_ATTRIBUTES).forEach(([attr, [from]]) => {
    useAttribute(host, attr, (oldValue, newValue) => {
      emitter.emit({ attr, old: from(oldValue), new: from(newValue) });
    });
  });

  buttonGroups.add(host);
}

export function isButtonGroupLike(value: unknown): value is ButtonGroupLike {
  return value instanceof ReactiveElement && buttonGroups.has(value);
}
