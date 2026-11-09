/**
 * A model of receiver-aware callbacks for `requestStep` and `use`, built on
 * `drag/step-queue-model` for the owner's inspection. It is not adopted, and the
 * contract does not describe it.
 */

/**
 * Callbacks in insertion order, each with the receiver it is called on, kept in
 * two adjacent slots of one array, so an entry allocates no pair. A callback
 * added with no receiver is called with none.
 *
 * The list decides nothing about when or whether its callbacks run, or what
 * happens when one throws. Its owner checks for a duplicate with `has` before
 * `add` when its entries coalesce, and runs entries from either end. An entry
 * is removed before its callback runs, so a throw leaves the list consistent
 * and a callback that adds itself again is added as a new entry.
 */
export class CallbackList<Argument> {
  /** `callback, receiver, callback, receiver, …`. `undefined` is no receiver. */
  readonly #entries: unknown[] = [];

  /** Whether an entry is waiting. */
  get waiting(): boolean {
    return this.#entries.length > 0;
  }

  /** Whether the same callback is waiting with the same receiver. */
  has(callback: unknown, receiver: unknown): boolean {
    for (let i = 0; i < this.#entries.length; i += 2) {
      if (this.#entries[i] === callback && this.#entries[i + 1] === receiver) {
        return true;
      }
    }

    return false;
  }

  /** Adds an entry at the end, whether or not the same pair is waiting. */
  add<Receiver>(
    callback: (this: Receiver, argument: Argument) => void,
    receiver: Receiver,
  ): void {
    this.#entries.push(callback, receiver);
  }

  /** Removes the first entry and calls it. Only while an entry is waiting. */
  runFirst(argument: Argument): void {
    const callback = this.#entries.shift() as (
      this: unknown,
      argument: Argument,
    ) => void;

    callback.call(this.#entries.shift(), argument);
  }

  /** Removes the last entry and calls it. Only while an entry is waiting. */
  runLast(argument: Argument): void {
    const receiver = this.#entries.pop();

    (this.#entries.pop() as (this: unknown, argument: Argument) => void).call(
      receiver,
      argument,
    );
  }

  /** Drops every entry and the references it holds. */
  clear(): void {
    this.#entries.length = 0;
  }
}
