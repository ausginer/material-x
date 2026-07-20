/**
 * The generic transition store. All state updates and effects for one feature
 * pass through {@link DragSession.dispatch}: the next state is assigned *before*
 * effects run, so a synchronous browser follow-up caused by an effect observes
 * the advanced state and cannot repeat work.
 *
 * Effects may re-enter `dispatch` (a consumer callback may destroy the
 * controller); because state is already advanced, the nested transition starts
 * from the current state. An event that defines no transition returns the
 * identical previous state, and effects are skipped for it, so foreign and
 * duplicate events cannot repeat movement or settling work.
 */

/**
 * Describes one meaningful protocol edge that has already occurred. Passed as
 * three positional arguments, not an allocated record, so the hot path stays
 * allocation-light.
 */
export type DragTransition<S, E> = (from: S, to: S, event: E) => void;

/** A pure feature root reducer: one complete next state from previous + event. */
export type Reducer<S, E> = (from: S, event: E) => S;

export type DragSession<S, E> = Readonly<{
  /** The current complete feature state. */
  state(): S;
  /** Feeds one event through the reducer and routes the resulting effects. */
  dispatch(event: E): void;
  /**
   * Terminal, idempotent. Marks the session closed, replaces its state with the
   * feature's initial idle state, and makes later dispatches inert. Does not
   * route effects.
   */
  close(): void;
}>;

export function createSession<S, E>(
  initial: S,
  reduce: Reducer<S, E>,
  onTransition: DragTransition<S, E>,
): DragSession<S, E> {
  let current = initial;
  let closed = false;

  return {
    state() {
      return current;
    },

    dispatch(event) {
      if (closed) {
        return;
      }

      const previous = current;
      const next = reduce(previous, event);

      // Assign before effects so re-entrant dispatches and synchronous browser
      // follow-ups see the advanced state.
      current = next;

      if (next !== previous) {
        onTransition(previous, next, event);
      }
    },

    close() {
      if (closed) {
        return;
      }

      closed = true;
      current = initial;
    },
  };
}
