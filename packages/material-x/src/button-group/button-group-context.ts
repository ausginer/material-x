import { createContext, type Context } from 'ydin/controllers/useContext.js';
import type { EventEmitter } from 'ydin/emitter.js';
import type { Disableable } from 'ydin/traits/disableable.js';
import type { Valuable } from 'ydin/traits/valuable.js';
import type { ButtonLike } from '../button/ButtonCore.ts';
import type { ButtonGroupLike } from './ButtonGroupCore.ts';

export type ButtonGroupProvider = ButtonLike & ButtonGroupLike & Disableable;

export type ChangedAttribute<
  T extends ButtonGroupProvider,
  A extends keyof T,
> = readonly [attr: A, old: T[A], new: T[A]];

export type ButtonGroupProvierChangedAttribute = ChangedAttribute<
  ButtonGroupProvider,
  keyof ButtonGroupProvider
>;
export type ContextData<T extends ButtonGroupProvider = ButtonGroupProvider> =
  Readonly<{
    emitter: EventEmitter<ChangedAttribute<T, keyof T>>;
    provider: T;
  }>;

export const BUTTON_GROUP_CTX: Context<ContextData> = createContext();

export type ConnectedButtonGroupProvider = ButtonGroupProvider & Valuable;

export type ConnectedButtonGroupProviderChangedAttribute = ChangedAttribute<
  ConnectedButtonGroupProvider,
  keyof ConnectedButtonGroupProvider
>;

export const CONNECTED_GROUP_CTX: Context<
  ContextData<ConnectedButtonGroupProvider>
> = createContext();
