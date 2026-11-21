import {
  createContext,
  type Context,
} from '@ydinjs/core/controllers/useContext.js';

/** What an item runs while it is in a sortable list. */
export type SortableItem = Readonly<{
  /** Writes the item's sortable semantics again, after a slot change. */
  update: () => void;
  /** Removes what the item wrote, when the connection ends. */
  release: () => void;
}>;

/**
 * Applies the sortable semantics to the item's own elements, `host` and its
 * `control`, and returns what the item runs afterwards. It returns `undefined`
 * and writes nothing when the providing list isn't the item's parent.
 */
export type SortableItemWriter = (
  host: HTMLElement,
  control: HTMLElement,
) => SortableItem | undefined;

/**
 * The context that `mx-sortable-list` provides to its items. Every list item
 * reads it, so this module holds no runtime code beyond the token, and the
 * writer that the value carries lives in the sortable list's own modules.
 */
export const SORTABLE_LIST_CTX: Context<SortableItemWriter> = createContext();
