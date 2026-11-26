/**
 * Callback invoked with an optional sibling element.
 *
 * When the sibling does not exist, the callback receives `undefined`.
 */
export type SiblingUpdateCallback = (sibling?: HTMLElement) => void;

/**
 * Callback invoked only when a sibling element is known to exist.
 */
export type ExistingSiblingUpdateCallback = (sibling: HTMLElement) => void;

/**
 * Adds or removes a custom state from `ElementInternals.states`.
 *
 * @param internals - Host internals whose state set should be updated.
 * @param state - State token to add or remove.
 * @param condition - Whether the state should be present.
 */
export function toggleState(
  internals: ElementInternals,
  state: string,
  condition: boolean,
): void {
  if (condition) {
    internals.states.add(state);
  } else {
    internals.states.delete(state);
  }
}

/**
 * Switches a custom state from one value to another in `ElementInternals.states`.
 *
 * Removes `oldState` if non-null and adds `newState` if non-null. Use for
 * value-based attributes where the attribute value is the state name itself
 * (e.g. `color='elevated'` → state `elevated`). Pass old and new serialized
 * attribute values directly — null is treated as "no state".
 *
 * @param internals - Host internals whose state set should be updated.
 * @param oldState - State token to remove, or null.
 * @param newState - State token to add, or null.
 */
export function switchState(
  internals: ElementInternals,
  oldState: string | null,
  newState: string | null,
): void {
  if (oldState != null) {
    internals.states.delete(oldState);
  }

  if (newState != null) {
    internals.states.add(newState);
  }
}

export class FrameRequestHandler {
  #scheduled = false;
  #handle = -1;

  schedule(callback: FrameRequestCallback): void {
    if (!this.#scheduled) {
      this.#handle = requestAnimationFrame(callback);
      this.#scheduled = true;
    }
  }

  cancel(): void {
    cancelAnimationFrame(this.#handle);
    this.#scheduled = false;
  }
}
