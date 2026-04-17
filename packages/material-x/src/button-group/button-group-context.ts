import type { AttributePrimitive } from 'ydin/attribute.js';
import { createContext, type Context } from 'ydin/controllers/useContext.js';
import type { EventEmitter } from 'ydin/emitter.js';
import type { ButtonLike } from '../button/ButtonCore.ts';
import type { ButtonGroupLike } from './ButtonGroupCore.ts';

type ButtonGroupProvider = ButtonLike & ButtonGroupLike;

export type ChangedAttribute<
  T extends AttributePrimitive = AttributePrimitive,
> = readonly [attr: keyof ButtonGroupProvider, old: T | null, new: T | null];

export type ContextData = Readonly<{
  emitter: EventEmitter<ChangedAttribute>;
  provider: ButtonGroupProvider;
}>;

export const BUTTON_GROUP_CTX: Context<ContextData> = createContext();
