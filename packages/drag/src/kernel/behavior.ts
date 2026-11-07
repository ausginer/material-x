import type { Admission, LiftedAdmission } from './admission.ts';
import type { Drag, LiftedDrag } from './drag.ts';
import type { Landing, lift } from './lift.ts';
import type { Outcome } from './outcome.ts';

type Hooks<Operation, Admitted, Settled, Verdict> = Readonly<{
  /** Pointer travel that activates, in viewport pixels. Defaults to 8. */
  threshold?: number;
  /** A primary press on the root. Return `null` to decline. */
  admit(event: PointerEvent): Admitted | null;
  /**
   * A key on the root. An admission runs one complete operation with no pointer:
   * activate, start, drop, settle and end. The key's default is then prevented.
   */
  command?(event: KeyboardEvent): Admitted | null;
  /**
   * Everything that can fail. `false` declines quietly and a throw is a fault.
   * Neither gets `start` or `end`.
   */
  activate?(drag: Operation): false | undefined;
  /** The consumer's notification. From here `end` is guaranteed. */
  start?(drag: Operation): void;
  move?(drag: Operation): void;
  /** Returns the verdict to wait for, or `null` to skip it. */
  drop?(
    drag: Operation,
  ): ((signal: AbortSignal) => Verdict | PromiseLike<Verdict>) | null;
  /**
   * The outcome is decided and the presentation is still held. Runs only if
   * `start` was reached.
   */
  settle?(drag: Operation, outcome: Outcome<Verdict>): Settled;
  /**
   * Runs after release and after the landing starts, in the same task. A landing
   * does not delay it. Focus returns after it, so a reorder here keeps focus.
   */
  end?(drag: Operation, outcome: Outcome<Verdict>): void;
}>;

/** A behavior with no top layer and no measurement. It renders by itself. */
export type Behavior<State = undefined, Verdict = unknown> = Hooks<
  Drag<State>,
  Admission<State>,
  null | undefined,
  Verdict
> &
  Readonly<{ lift?: undefined }>;

/**
 * A behavior whose visual the library promotes to the top layer. `settle` names
 * where the visual lands, or `null`.
 */
export type LiftedBehavior<State = undefined, Verdict = unknown> = Hooks<
  LiftedDrag<State>,
  LiftedAdmission<State>,
  Landing | null | undefined,
  Verdict
> &
  Readonly<{ lift: typeof lift }>;

export type AnyBehavior<State, Verdict> = Hooks<
  LiftedDrag<State>,
  LiftedAdmission<State>,
  Landing | null | undefined,
  Verdict
> &
  Readonly<{ lift?: typeof lift }>;
