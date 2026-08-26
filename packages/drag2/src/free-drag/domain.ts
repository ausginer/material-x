/**
 * Free drag's domain vocabulary: what a drop *is*, what the consumer is asked,
 * what it may answer, and what it is told afterwards.
 *
 * Nothing here reads the DOM or holds state. Every value is a plain immutable
 * object, because every one of them is handed to consumer code.
 */
import type { CancelStage } from '../kernel/failures.ts';
import type { Point } from '../kernel/types.ts';

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
 * `viewportDeltaX`/`viewportDeltaY` are the **rendered** delta — axis-projected
 * and clamped — not the raw pointer travel, which is what makes `currentRect`
 * the visual's real box under an axis lock or a bounds clamp.
 *
 * **Every coordinate is a scalar field.** `onMove` runs once per committed
 * sample, so a pair per coordinate would allocate four objects a frame that the
 * consumer reads twice each and drops; the two rects are the only objects here,
 * and they are objects because a rect is one.
 */
export type DragGeometry = Readonly<{
  /** Current pointer position, viewport space. */
  pointerX: number;
  pointerY: number;
  /** Pointer position at grab, viewport space. */
  originPointerX: number;
  originPointerY: number;
  /** What the visual was actually translated by, viewport space. */
  viewportDeltaX: number;
  viewportDeltaY: number;
  /**
   * The same delta in the space a transform authored on the visual acts in —
   * the **inherited** ancestor space. The coefficients are captured once at
   * activation, so this costs four multiplies per sample and is not optional.
   */
  localDeltaX: number;
  localDeltaY: number;
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
    pointerX: number;
    pointerY: number;
    /** The visual's top-left at release, viewport space. */
    positionX: number;
    positionY: number;
    viewportDeltaX: number;
    viewportDeltaY: number;
    localDeltaX: number;
    localDeltaY: number;
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

// Erased: `declare const` emits no JavaScript, and no value carries the key.
// It exists to keep the shape below unwritable by anything but the factories.
declare const RESOLUTION: unique symbol;

/**
 * The explicit consumer response. **Acceptance is never inferred** — not from
 * callback silence, not from DOM mutation, not from elapsed time.
 *
 * **Opaque, and a round trip rather than a record.** It is built by
 * {@link FreeDragResolution.accept} or {@link FreeDragResolution.reject},
 * returned from `onDrop`, and read only by the library; the verdict reaches the
 * consumer again as a `FreeDragTransactionResult`, which is the shape with the
 * fields on it. Nothing here is inspectable and nothing here needs to be.
 */
export type FreeDragResolution = Readonly<{ [RESOLUTION]: never }>;

/**
 * The representation both arms share, read only by `settlement.prepare`: a
 * carrier holding the reason, or holding nothing.
 */
export type RejectionCarrier = readonly [reason?: unknown];

/**
 * Acceptance is a **shared value** — it declares nothing, so there is one of it
 * for the life of the module and an accepted drop allocates nothing at all.
 * Rejection is the same carrier with the reason in it, and the only arm that
 * has to be built.
 *
 * **Identity is the discriminant**, which is why the empty carrier is a
 * constant rather than a fresh one per acceptance: there is no string to ship,
 * none to compare, and nothing on the value for a consumer to read or forge.
 */
export const ACCEPTED = [] as RejectionCarrier as unknown as FreeDragResolution;

/**
 * **Both factories take at most a reason**, as the sortable's do: acceptance
 * declares nothing, because a consumer that must render before the drop lands
 * `await`s its own commit inside `onDrop`.
 */
export const FreeDragResolution = {
  accept: (): FreeDragResolution => ACCEPTED,
  reject: (reason?: unknown): FreeDragResolution =>
    [reason] as RejectionCarrier as unknown as FreeDragResolution,
} as const;

/**
 * The consumer round-trip. `PromiseLike`, not `Promise`, because the kernel
 * reads `then` exactly once and never assumes a native promise.
 */
export type OnDrop = (
  request: FreeDragRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => FreeDragResolution | PromiseLike<FreeDragResolution>;

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
