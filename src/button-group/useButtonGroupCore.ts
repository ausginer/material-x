import {
  DEFAULT_BUTTON_ATTRIBUTES,
  type ButtonLike,
} from '../button/useButtonCore.ts';
import { useAttribute } from '../core/controllers/useAttribute.ts';
import { useProvider } from '../core/controllers/useContext.ts';
import { EventEmitter } from '../core/elements/emitter.ts';
import type { ReactiveElement } from '../core/elements/reactive-element.ts';
import type { TypedObjectConstructor } from '../interfaces.ts';
import {
  BUTTON_GROUP_CTX,
  type ChangedAttribute,
} from './button-group-context.ts';

export type ButtonGroupLike = ButtonLike;

const buttonGroups = new WeakSet<ButtonGroupLike>();

export function useButtonGroupCore(
  host: ButtonGroupLike & ReactiveElement,
): void {
  const emitter = new EventEmitter<ChangedAttribute>();

  useProvider(host, BUTTON_GROUP_CTX, { emitter, provider: host });

  (Object as TypedObjectConstructor)
    .entries(DEFAULT_BUTTON_ATTRIBUTES)
    .map(([attr, [from]]) => {
      useAttribute(host, attr, (oldValue, newValue) => {
        emitter.emit({ attr, old: from(oldValue), new: from(newValue) });
      });
    });

  buttonGroups.add(host);
}

export function isButtonGroupLike(value: unknown): value is ButtonGroupLike {
  // @ts-expect-errors: simplifying check
  return buttonGroups.has(value);
}
