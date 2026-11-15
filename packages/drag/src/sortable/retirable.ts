/**
 * Something that holds state for a controller or an operation and lets go of it
 * when that ends: a sortable's axis geometry, its displacement sink, and the
 * indexes and shifts behind them.
 */
export interface Retirable {
  /**
   * Releases what the implementer holds for its controller or operation, such as
   * the elements it measured, so that nothing retains them after it ends.
   * `sortable` passes the axis geometry's to the operation's `use`, so it runs when
   * the operation ends, and the displacement sink's to the controller's `use`, so
   * it runs at destruction. A geometry calls its own index's or shift's.
   */
  retire(): void;
}
