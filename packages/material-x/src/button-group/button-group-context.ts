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
import { effect, signal, type Signal } from '@ydinjs/signals';
import type { ButtonLike } from '../button/ButtonCore.ts';
import type {
  AttributeName,
  AttributeWatcher,
  ContextData,
} from '../core/utils/useContext.ts';
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

  // The group creates each button's effect, so that a button imports nothing
  // from signals. One effect per connected button: each run reads every
  // attribute the button follows, so it is subscribed to all of them, and it
  // calls back for those that changed since the previous run.
  const watch: AttributeWatcher<T> = (names, callback) => {
    const previous: Array<string | null> = [];
    const sources: ReadonlyArray<Signal<string | null>> = names.map(
      (name) => signals[name],
    );

    return effect(sources, (...values) => {
      const joining = previous.length === 0;

      names.forEach((name, index) => {
        const value = values[index]!();
        const oldValue = joining ? null : previous[index]!;

        if (joining || value !== oldValue) {
          callback(name, oldValue, value);
        }

        previous[index] = value;
      });
    });
  };

  useProvider(host, ctx, { watch });

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
