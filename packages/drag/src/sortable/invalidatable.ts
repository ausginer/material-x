/**
 * Something that holds measured geometry and can be told it is out of date: a
 * sortable's axis geometry, and the indexes and shifts behind it.
 */
export interface Invalidatable {
  /**
   * Marks what the implementer holds as stale, so that its next read measures
   * again. It reads no layout, because scroll and resize call it many times a
   * second. `sortable` calls the axis geometry's as a step on each scroll and
   * resize during an operation, and on `invalidate()`. A geometry calls its own
   * index's or shift's.
   */
  invalidate(): void;
}
