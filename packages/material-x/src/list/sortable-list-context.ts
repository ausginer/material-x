import {
  createContext,
  type Context,
} from '@ydinjs/core/controllers/useContext.js';

/**
 * The context that `mx-sortable-list` provides to its items. Its value is the
 * list element, so an item can tell whether the list is its parent. It imports
 * no drag module, because every list item reads it.
 */
export const SORTABLE_LIST_CTX: Context<HTMLElement> = createContext();

/**
 * The item's handle: a child element with `data-handle` in its `lead` or
 * `trail` slot. The item and the list use this one rule, so they agree.
 */
export function handleOf(item: HTMLElement): HTMLElement | null {
  return item.querySelector(
    ':scope > [data-handle]:is([slot=lead],[slot=trail])',
  );
}
