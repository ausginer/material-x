/**
 * Free drag's domain vocabulary: what a drop *is*, what the consumer is asked,
 * what it may answer, and what it is told afterwards.
 *
 * Nothing here reads the DOM or holds state. Every value is a plain immutable
 * object, because every one of them is handed to consumer code.
 */
import type { CancelStage } from '../kernel/failures.ts';
import type { Point } from '../kernel/types.ts';

// A consumer domain of three strings; the behavior maps them to the kernel's
// numeric lift constants in the one place that knows both (D-73).
/**
 * How the visual is lifted. `'faithful'` and `'flat'` both promote it to the
 * top layer — `'faithful'` carrying the transform its ancestry gave it,
 * `'flat'` without it. `'in-place'` leaves it in its container, riding the
 * authored transform and suppressing transitions.
 */
export type FreeDragLift = 'faithful' | 'flat' | 'in-place';

/** Which axes the drag may travel on. `'both'` by default. */
export type DragAxis = 'both' | 'x' | 'y';

/**
 * **A policy source, re-read rather than pushed.** Read at activation and on
 * `invalidate()`, never per sample.
 */
export type AxisSource = () => DragAxis;

// Published from free drag's own root rather than shared with the kernel: what
// was refused was the shared name, not the shape (F-66).
/**
 * The two elements one operation is about.
 */
export type FreeDragSubject = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
}>;

/**
 * What `onStart` and `onMove` are handed, derived from committed state and
 * **reproducible without a layout read**.
 *
 * `viewportDelta` is the **rendered** delta — axis-projected and clamped — not
 * the raw pointer travel, which is what makes `currentRect` the visual's real
 * box under an axis lock or a bounds clamp.
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
   * the **inherited** ancestor space. The coefficients are captured once at
   * activation, so this costs four multiplies per sample and is not optional.
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
 * **Every point on this surface is viewport space.** Only a *delta* is offered
 * in the inherited ancestor space; a consumer whose model is some other space
 * maps the points itself.
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
 * Where a rejected or canceled drag returns to. Viewport space, and
 * both coordinates finite, as for every point on this surface.
 *
 * Nothing detects a non-finite one: it composes into the landing target and
 * reaches a renderer as a transform nobody can see. A `null`, a missing field
 * or a throwing accessor is different — the point is read inside the seam, so
 * those fail there, on the quality route. `onError` receives a
 * `DraggableWarning` rather than a `DraggableError`: the landing is skipped,
 * the committed drop stays settled, and the operation's outcome does not
 * change.
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
 * **Both factories take no argument**, as the sortable's do: acceptance
 * declares nothing, because a consumer that must render before the drop lands
 * `await`s its own commit inside `onDrop`.
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
 * **Three arms**, one fewer than the sortable's. A free drag has no
 * identity-preserving success state: `accept()` means *keep it where it
 * landed* whether or not it travelled, and a zero-distance drop is an ordinary
 * acceptance.
 */
export type FreeDragTransactionResult =
  | AcceptedFreeDragResult
  | RejectedFreeDragResult
  | CanceledFreeDragResult;
