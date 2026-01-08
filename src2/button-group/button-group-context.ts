import { createContext, type Context } from '../core/controllers/useContext.ts';
import type { EventEmitter } from '../core/elements/emitter.ts';
import type { ButtonGroupLike } from './useButtonGroupCore.ts';

export type ChangedAttribute<
  T extends string | boolean | number = string | boolean | number,
> = Readonly<{
  attr: keyof ButtonGroupLike;
  old: T | null;
  new: T | null;
}>;

export type ContextData = Readonly<{
  emitter: EventEmitter<ChangedAttribute>;
  provider: ButtonGroupLike;
}>;

export const BUTTON_GROUP_CTX: Context<ContextData> = createContext();
