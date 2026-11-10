/** A callback a list holds: called on its receiver, or with none. */
type ListedCallback<Argument> = (
  this: object | undefined,
  argument: Argument,
) => void;

/** `callback, receiver, callback, receiver, …`. `undefined` is no receiver. */
type Entries<Argument> = Array<ListedCallback<Argument> | object | undefined>;

/**
 * Callbacks, each with the receiver it is called on, kept in two adjacent slots
 * of one array, so an entry allocates no object. A callback added with no
 * receiver is called with none.
 *
 * A list holds only the name of the array method it adds with. `queue()` makes
 * a list that adds at the start of the array, and `stack()` one that adds at
 * the end. `run` takes the entry at the end for both, so a queue runs its
 * oldest entry and a stack its newest, and `run` does not branch on the kind.
 *
 * The list decides nothing about when or whether its callbacks run, or what
 * happens when one throws. An owner whose entries coalesce checks `has` before
 * `add`. An entry is removed before its callback runs, so a throw leaves the
 * list consistent and a callback that adds itself again is added as a new
 * entry.
 */
export class CallbackList<Argument> {
  /** A list run first in first out. */
  static queue<Argument>(): CallbackList<Argument> {
    return new CallbackList<Argument>('unshift');
  }

  /** A list run last in first out. */
  static stack<Argument>(): CallbackList<Argument> {
    return new CallbackList<Argument>('push');
  }

  readonly #entries: Entries<Argument> = [];
  readonly #insertName: 'push' | 'unshift';

  private constructor(insertName: 'push' | 'unshift') {
    this.#insertName = insertName;
  }

  /** Whether no entry is waiting. */
  get empty(): boolean {
    return this.#entries.length === 0;
  }

  /** Whether the same callback is waiting with the same receiver. */
  has(
    callback: ListedCallback<Argument>,
    receiver: object | undefined,
  ): boolean {
    for (let i = 0; i < this.#entries.length; i += 2) {
      if (this.#entries[i] === callback && this.#entries[i + 1] === receiver) {
        return true;
      }
    }

    return false;
  }

  /**
   * Adds an entry, at the start of a queue's array and at the end of a stack's,
   * whether or not the same pair is waiting.
   */
  add<Receiver extends object>(
    callback: (this: Receiver, argument: Argument) => void,
    receiver?: Receiver,
  ): void {
    this.#entries[this.#insertName](callback, receiver);
  }

  /**
   * Removes the entry at the end of the array and calls its callback with
   * `argument`, on its receiver. Call it only when an entry is waiting.
   */
  run(argument: Argument): void {
    const receiver = this.#entries.pop();
    (this.#entries.pop() as ListedCallback<Argument>).call(receiver, argument);
  }

  /** Drops every entry and the references it holds. */
  clear(): void {
    this.#entries.length = 0;
  }
}
