/** A callback a list holds: called on its receiver, or with none. */
type ListedCallback<Argument> = (
  this: object | undefined,
  argument: Argument,
) => void;

/** `callback, receiver, callback, receiver, …`. `undefined` is no receiver. */
type Entries<Argument> = Array<ListedCallback<Argument> | object | undefined>;

/** Removes one entry from `entries` and calls its callback. */
type Direction<Argument> = (
  entries: Entries<Argument>,
  argument: Argument,
) => void;

/**
 * Callbacks, each with the receiver it is called on, kept in two adjacent slots
 * of one array, so an entry allocates no object. A callback added with no
 * receiver is called with none.
 *
 * `queue()` makes a list whose `run` calls its first entry, and `stack()` one
 * whose `run` calls its last. Each list holds its own direction function, so
 * `run` does not branch on direction.
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
    return new CallbackList<Argument>((entries, argument) => {
      const callback = entries.shift() as ListedCallback<Argument>;
      callback.call(entries.shift(), argument);
    });
  }

  /** A list run last in first out. */
  static stack<Argument>(): CallbackList<Argument> {
    return new CallbackList<Argument>((entries, argument) => {
      const receiver = entries.pop();
      (entries.pop() as ListedCallback<Argument>).call(receiver, argument);
    });
  }

  readonly #entries: Entries<Argument> = [];
  readonly #direction: Direction<Argument>;

  private constructor(direction: Direction<Argument>) {
    this.#direction = direction;
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

  /** Adds an entry at the end, whether or not the same pair is waiting. */
  add<Receiver extends object>(
    callback: (this: Receiver, argument: Argument) => void,
    receiver?: Receiver,
  ): void {
    this.#entries.push(callback, receiver);
  }

  /**
   * Removes the next entry and calls its callback with `argument`, on its
   * receiver. Call it only when an entry is waiting.
   */
  run(argument: Argument): void {
    this.#direction(this.#entries, argument);
  }

  /** Drops every entry and the references it holds. */
  clear(): void {
    this.#entries.length = 0;
  }
}
