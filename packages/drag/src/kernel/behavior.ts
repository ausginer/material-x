import type { Admission } from './admission.ts';
import type { Drag } from './drag.ts';
import type { Outcome } from './outcome.ts';

export type VerdictAwaiter<Verdict> = (
  signal: AbortSignal,
) => Verdict | PromiseLike<Verdict>;

/**
 * One activated operation's hooks, from `start` to `end`. `activate` returns it,
 * and steps receive it.
 */
export type BehaviorOperation<Verdict = unknown> = Readonly<{
  /** The consumer's notification. From here `end` is guaranteed. */
  start?(): void;
  move?(): void;
  /** Returns the verdict to wait for, or `null` to skip it. */
  drop?(): VerdictAwaiter<Verdict> | null;
  /**
   * The outcome is decided, and `drag.signal` has not aborted yet. Runs only if
   * `start` was reached.
   */
  settle?(outcome: Outcome<Verdict>): void;
  /**
   * Runs after release, in the same task as the decision. Focus returns after it,
   * so a reorder here keeps focus.
   */
  end?(outcome: Outcome<Verdict>): void;
}>;

/** What lasts as long as the controller: admission and activation. */
export type Behavior<
  State = undefined,
  Verdict = unknown,
  Operation extends BehaviorOperation<Verdict> = BehaviorOperation<Verdict>,
> = Readonly<{
  /** Pointer travel that activates, in viewport pixels. Defaults to 8. */
  threshold?: number;
  /** A primary press on the root. Return `null` to decline. */
  admit(event: PointerEvent): Admission<State> | null;
  /**
   * A key on the root. An admission runs one complete operation with no pointer:
   * activate, start, drop, settle and end. The key's default is then prevented.
   */
  command?(event: KeyboardEvent): Admission<State> | null;
  /**
   * Everything that can fail. `state` is the admission's. Returns the operation,
   * whose hooks run until `end`. `null` declines quietly and a throw is a fault.
   * Neither gets `start` or `end`.
   */
  activate(drag: Drag<Operation>, state: State): Operation | null;
}>;
