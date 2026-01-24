import type { ButtonLike } from '../button/ButtonCore.ts';
import { createContext, type Context } from '../core/controllers/useContext.ts';
import type { AttributePrimitive } from '../core/elements/attribute.ts';
import type { EventEmitter } from '../core/elements/emitter.ts';
import type { ButtonGroupLike } from './ButtonGroupCore.ts';

type ButtonGroupProvider = ButtonLike & ButtonGroupLike;

export type ChangedAttribute<
  T extends AttributePrimitive = AttributePrimitive,
> = Readonly<{
  attr: keyof ButtonGroupProvider;
  old: T | null;
  new: T | null;
}>;

export type ContextData = Readonly<{
  emitter: EventEmitter<ChangedAttribute>;
  provider: ButtonGroupProvider;
}>;

export const BUTTON_GROUP_CTX: Context<ContextData> = createContext();
