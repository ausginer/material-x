/**
 * A model of receiver-aware deferred steps, built on `drag/step-queue-model` for
 * the owner's inspection. It is not adopted, and the contract does not describe
 * it.
 */

/**
 * The steps a running pass deferred, in request order. Each entry is a step and
 * the receiver it is called on, kept in two adjacent slots of one array, so a
 * request allocates no pair. A step requested with no receiver is called with
 * none.
 *
 * The queue decides nothing about when its steps run. The controller's reader
 * asks whether one is waiting and runs the first one when its precedence allows.
 */
export class StepQueue<Argument> {
  /** `step, receiver, step, receiver, …`. `undefined` stands for no receiver. */
  readonly #entries: unknown[] = [];

  /** Whether a step is waiting. */
  get waiting(): boolean {
    return this.#entries.length > 0;
  }

  /**
   * Adds the pair, unless the same step is already waiting with the same
   * receiver. So one method requested for two objects runs once for each. A
   * step that is running is no longer waiting, so a request it makes for itself
   * runs it again.
   */
  add<Receiver>(
    step: (this: Receiver, argument: Argument) => void,
    receiver: Receiver,
  ): void {
    const entries = this.#entries;

    for (let i = 0; i < entries.length; i += 2) {
      if (entries[i] === step && entries[i + 1] === receiver) {
        return;
      }
    }

    entries.push(step, receiver);
  }

  /**
   * Takes the first pair off and calls its step on its receiver. Call it only
   * while a step is waiting.
   */
  runFirst(argument: Argument): void {
    const step = this.#entries.shift() as (
      this: unknown,
      argument: Argument,
    ) => void;

    step.call(this.#entries.shift(), argument);
  }

  /** Drops every waiting pair and the references it holds. */
  clear(): void {
    this.#entries.length = 0;
  }
}
