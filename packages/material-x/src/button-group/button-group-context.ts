import {
  useAttributes,
  type UpdateCallback,
} from 'ydin/controllers/useAttributes.js';
import {
  createContext,
  useProvider,
  type Context,
} from 'ydin/controllers/useContext.js';
import type { ControlledElement } from 'ydin/element.js';
import { EventEmitter } from 'ydin/emitter.js';
import type { Disableable } from 'ydin/traits/disableable.js';
import type { Valuable } from 'ydin/traits/valuable.js';
import type { ButtonLike } from '../button/ButtonCore.ts';
import type {
  ChangedAttribute,
  ContextData,
} from '../core/utils/useContext.ts';
import type { ButtonGroupLike } from './ButtonGroupCore.ts';

export const BUTTON_GROUP_CTX: Context<
  ContextData<ControlledElement & ButtonLike & ButtonGroupLike & Disableable>
> = createContext();

export const CONNECTED_GROUP_CTX: Context<
  ContextData<
    ControlledElement & ButtonLike & ButtonGroupLike & Disableable & Valuable
  >
> = createContext();

export function useButtonGroupProvider<T extends ControlledElement>(
  host: T,
  ctx: Context<ContextData<T>>,
  attributes: ReadonlyArray<Exclude<keyof T & string, keyof ControlledElement>>,
): void {
  const emitter = new EventEmitter<ChangedAttribute>();

  useProvider(host, ctx, { emitter, provider: host });

  useAttributes(
    host,
    Object.fromEntries(
      attributes.map(
        (attr) =>
          [
            attr,
            ((oldValue, newValue) =>
              emitter.emit(attr, oldValue, newValue)) satisfies UpdateCallback,
          ] as const,
      ),
    ),
  );
}
