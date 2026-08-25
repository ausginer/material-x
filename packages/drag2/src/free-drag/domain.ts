/**
 * Free drag's domain vocabulary: what a drop *is*, what the consumer is asked,
 * what it may answer, and what it is told afterwards (contract 07 §The results,
 * §The published names).
 *
 * Nothing here reads the DOM or holds state. Every value is a plain immutable
 * object, because every one of them is handed to consumer code.
 */
import type { CancelStage } from '../kernel/failures.ts';
import type { Point } from '../kernel/types.ts';

/**
 * **A consumer domain of three strings, not the kernel's enum** (D-73). The
 * ordinary tier never names a numeric `LIFT_*` constant; the behavior maps one
 * to the other in the one place that knows both.
 *
 * **Renamed from the shipped strings, breaking, and the reason is not
 * tidiness**: `'top-layer'` named one mode after a mechanism it shares with its
 * sibling — both promoted modes use the top layer here — and `'none'` said *no
 * lift* for a mode that lifts, suppresses transitions and projects coordinates.
 * The precedent is `vertical()` → `y()`: a layout word for a rule about a
 * coordinate.
 */
export type FreeDragLift = 'faithful' | 'flat' | 'in-place';

/** Which axes the drag may travel on. `'both'` by default. */
export type DragAxis = 'both' | 'x' | 'y';

/**
 * **A policy source, re-read rather than pushed** (D-71). Read at activation and
 * on `invalidate()`, never per sample: the axis decides two comparisons on the
 * hot path and re-reading it there would put a consumer call on it.
 */
export type AxisSource = () => DragAxis;

/**
 * The two elements one operation is about.
 *
 * **Free drag publishes its own rather than sharing a kernel name** (F-66).
 * `DragSubject` was dropped at Checkpoint D, and what was refused was the
 * *shared* name, not the shape — `ResolveHome` names this type, and a slot a
 * consumer cannot hoist is not a writable surface (F-51).
 */
export type FreeDragSubject = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
}>;

/**
 * What `onStart` and `onMove` are handed, derived from committed state and
 * **reproducible without a layout read** (parity: the shipped `DragGeometry`,
 * retained).
 *
 * `viewportDelta` is the **rendered** delta — axis-projected and clamped — not
 * the raw pointer travel, which is what makes `currentRect` the visual's real
 * box under an axis lock or a bounds clamp. The shipped package made the same
 * choice and for the same reason.
 */
export type DragGeometry = Readonly<{
  /** Current pointer position, viewport space. */
  pointer: Point;
  /** Pointer position at grab, viewport space. */
  originPointer: Point;
  /** What the visual was actually translated by, viewport space. */
  viewportDelta: Point;
  /**
   * The same delta in the space a transform authored on the visual acts in —
   * the **inherited** ancestor space (D-72).
   *
   * ~~The consumer supplies a `CoordinateMapper`.~~ **Dropped with
   * `coordinateSpace`**: the shipped default mapper was an `offsetParent` walk,
   * which is a coordinate module, and this package has none. box-quad hands
   * back the inherited linear part from the traversal it already performs, a
   * delta maps through the linear part alone, and the coefficients are captured
   * once at activation — so the warm call is four multiplies and no option.
   */
  localDelta: Point;
  /** The visual's rect at grab, viewport space. */
  originRect: DOMRectReadOnly;
  /** The visual's current rect, viewport space. Derived, never measured. */
  currentRect: DOMRectReadOnly;
}>;

/**
 * Where a free drag was released — the question `onDrop` answers.
 *
 * **`localPosition` is gone** (D-72). A *delta* maps through the inherited
 * linear part alone; a *point* additionally needs the translation, and box-quad
 * exposes none. Every point on this surface is therefore viewport, and a
 * consumer whose model is not an ancestor-transform space maps it itself —
 * which it can, because the mapping is theirs and they hold both ends of it.
 */
export type FreeDragRequest = FreeDragSubject &
  Readonly<{
    pointer: Point;
    /** The visual's top-left at release, viewport space. */
    viewportPosition: Point;
    viewportDelta: Point;
    localDelta: Point;
    visualRect: DOMRectReadOnly;
  }>;

/**
 * Where a rejected or canceled drag returns to. Viewport space (D-72), and
 * both coordinates finite, as for every point on this surface.
 *
 * Nothing detects a non-finite one: it composes into the landing target and
 * reaches a renderer as a transform nobody can see. A `null`, a missing field
 * or a throwing accessor is different — the point is read inside the seam, so
 * those fail there and are classified `FAILURE_LANDING_TARGET` on the quality
 * route, which skips the landing and leaves a committed drop settled.
 */
export type ResolveHome = (subject: FreeDragSubject) => Point;

export type AcceptedFreeDragResolution = Readonly<{ type: 'accepted' }>;

export type RejectedFreeDragResolution = Readonly<{
  type: 'rejected';
  reason?: unknown;
}>;

/**
 * The explicit consumer response. **Acceptance is never inferred** — not from
 * callback silence, not from DOM mutation, not from elapsed time.
 */
export type FreeDragResolution =
  | AcceptedFreeDragResolution
  | RejectedFreeDragResolution;

/**
 * **Both factories take no argument** (D-41), as the sortable's do: acceptance
 * declares nothing, because a consumer that must render before the drop lands
 * `await`s its own commit inside `onDrop`, which is what a Promise-returning
 * resolver already expresses.
 */
export const FreeDragResolution = {
  accept: (): AcceptedFreeDragResolution => ({ type: 'accepted' }),
  reject: (reason?: unknown): RejectedFreeDragResolution => ({
    type: 'rejected',
    reason,
  }),
} as const;

/**
 * The consumer round-trip. `PromiseLike`, not `Promise`, because the kernel
 * reads `then` exactly once and never assumes a native promise.
 */
export type OnDrop = (
  request: FreeDragRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => FreeDragResolution | PromiseLike<FreeDragResolution>;

/**
 * Whether a fulfilled round-trip value is an explicit resolution. A value that
 * is not becomes `FAILURE_RESOLUTION`, never a silent accept.
 */
export function isFreeDragResolution(
  value: unknown,
): value is FreeDragResolution {
  const type = (value as FreeDragResolution | null | undefined)?.type;

  return type === 'accepted' || type === 'rejected';
}

export type AcceptedFreeDragResult = Readonly<{
  type: 'accepted';
  request: FreeDragRequest;
}>;

export type RejectedFreeDragResult = Readonly<{
  type: 'rejected';
  request: FreeDragRequest;
  reason: unknown;
}>;

export type CanceledFreeDragResult = Readonly<{
  type: 'canceled';
  /**
   * `null` exactly when the operation was abandoned **before release built
   * one** — the same shape the sortable's `proposal: null` has, and the reason
   * `stage` is carried.
   */
  request: FreeDragRequest | null;
  reason: unknown;
  stage: CancelStage;
}>;

/**
 * **Three arms, and the set was re-derived rather than inherited** (07 §The
 * results). The sortable's fourth arm exists because a reorder can be
 * structurally identity-preserving — a proposal whose `from` equals its `to` is
 * a real, resolved, successful transaction that changed nothing. A free drag has
 * no such state: `accept()` means *keep it where it landed* whether or not it
 * travelled, and a zero-distance drop is an ordinary acceptance. A `noop` arm
 * here would be an arm nothing can produce.
 */
export type FreeDragTransactionResult =
  | AcceptedFreeDragResult
  | RejectedFreeDragResult
  | CanceledFreeDragResult;

/**
 * **Qualified, because the unqualified form is already claimed by a different
 * structure** (D-75): `onError`'s context carries a behavior's own result, and
 * the sortable's carries a `ReorderTransactionResult`. The rule is exactly that
 * narrow — qualify a name when two entries need different structures under one
 * word, not because a word could conceivably be reused.
 */
export type FreeDragErrorContext = Readonly<{
  domain: FreeDragTransactionResult | null;
}>;
