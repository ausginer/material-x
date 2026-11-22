import {
  useAttributes,
  type UpdateCallback,
} from '@ydinjs/core/controllers/useAttributes.js';
import {
  createContext,
  useProvider,
  type Context,
} from '@ydinjs/core/controllers/useContext.js';
import type { ControlledElement } from '@ydinjs/core/element.js';
import type { Disableable } from '@ydinjs/core/traits/disableable.js';
import type { Valuable } from '@ydinjs/core/traits/valuable.js';
import { signal, type Signal } from '@ydinjs/signals';
import type { ButtonLike } from '../button/ButtonCore.ts';
import type { AttributeName, ContextData } from '../core/utils/useContext.ts';
import type { ButtonGroupLike } from './ButtonGroupCore.ts';

export const BUTTON_GROUP_CTX: Context<
  ContextData<
    ControlledElement & ButtonLike & ButtonGroupLike & Valuable & Disableable
  >
> = createContext();

/** The elements that provide `BUTTON_GROUP_CTX` to their child buttons. */
export const BUTTON_GROUP_ELEMENTS: readonly string[] = [
  'mx-button-group',
  'mx-connected-button-group',
];

export function useButtonGroupProvider<T extends ControlledElement>(
  host: T,
  ctx: Context<ContextData<T>>,
  attributes: ReadonlyArray<AttributeName<T>>,
): void {
  // One signal per forwarded attribute, holding the group's serialized value.
  const signals = Object.fromEntries(
    attributes.map((attr) => [attr, signal<string | null>(null)] as const),
  ) as Record<AttributeName<T>, Signal<string | null>>;

  useProvider(host, ctx, { attributes: signals });

  useAttributes(
    host,
    Object.fromEntries(
      attributes.map(
        (attr) =>
          [
            attr,
            ((_, newValue) =>
              signals[attr].set(newValue)) satisfies UpdateCallback,
          ] as const,
      ),
    ),
  );
}
