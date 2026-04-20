import type {
  AttributePrimitive,
  Converter,
  NullablePrimitive,
} from 'ydin/attribute.js';
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
import type { ButtonLike } from '../button/ButtonCore.ts';
import type { ButtonGroupLike } from './ButtonGroupCore.ts';

export type ChangedAttribute = readonly [
  attr: string,
  oldValue: NullablePrimitive<AttributePrimitive>,
  newValue: NullablePrimitive<AttributePrimitive>,
];
export type ContextData = Readonly<{
  emitter: EventEmitter<ChangedAttribute>;
  provider: ControlledElement & ButtonLike & ButtonGroupLike & Disableable;
}>;

export const BUTTON_GROUP_CTX: Context<ContextData> = createContext();

export const CONNECTED_GROUP_CTX: Context<ContextData> = createContext();

export function useButtonGroupProvider(
  host: ControlledElement & ButtonLike & ButtonGroupLike & Disableable,
  ctx: Context<ContextData>,
  attributeConverters: Readonly<Record<string, Converter>>,
): void {
  const emitter = new EventEmitter<ChangedAttribute>();

  useProvider(host, ctx, { emitter, provider: host });

  useAttributes(
    host,
    Object.fromEntries(
      Object.entries(attributeConverters).map(
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
