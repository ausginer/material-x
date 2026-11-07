import type { Admission } from './admission.ts';
import type { Drag } from './drag.ts';
import type { Outcome } from './outcome.ts';

/** The hooks `draggable` calls for each operation. */
export type Behavior<State = undefined, Verdict = unknown> = Readonly<{
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
   * Everything that can fail. `false` declines quietly and a throw is a fault.
   * Neither gets `start` or `end`.
   */
  activate?(drag: Drag<State>): false | undefined;
  /** The consumer's notification. From here `end` is guaranteed. */
  start?(drag: Drag<State>): void;
  move?(drag: Drag<State>): void;
  /** Returns the verdict to wait for, or `null` to skip it. */
  drop?(
    drag: Drag<State>,
  ): ((signal: AbortSignal) => Verdict | PromiseLike<Verdict>) | null;
  /**
   * The outcome is decided, and `drag.signal` has not aborted yet. Runs only if
   * `start` was reached.
   */
  settle?(drag: Drag<State>, outcome: Outcome<Verdict>): void;
  /**
   * Runs after release, in the same task as the decision. Focus returns after it,
   * so a reorder here keeps focus.
   */
  end?(drag: Drag<State>, outcome: Outcome<Verdict>): void;
}>;
