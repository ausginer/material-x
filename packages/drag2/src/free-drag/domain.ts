/**
 * Free drag's domain vocabulary: what a drop is, what the consumer is asked,
 * what it may answer, and what it is told afterwards.
 *
 * Nothing here reads the DOM or holds state. Every value is a plain immutable
 * object, because every one of them is passed to consumer code.
 */
import type { CancelOrigin, CancelStage } from '../kernel/failures.ts';
import type { Point } from '../kernel/types.ts';

/** Which axes the drag may travel on. `'both'` by default. */
export type DragAxis = 'both' | 'x' | 'y';

// Published from free drag's own root and not shared with the kernel.
/**
 * The two elements one operation is about.
 */
export type FreeDragSubject = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
}>;

/**
 * What `onStart` and `onMove` receive. It is derived from committed state and
 * can be reproduced without a layout read.
 *
 * `viewportDeltaX`/`viewportDeltaY` are the rendered delta, axis-projected and
 * clamped, not the raw pointer travel. So `currentRect` is the visual's real
 * box under an axis lock or a bounds clamp.
 *
 * Every coordinate is a scalar field. The two rects are the only objects here.
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
   * The same delta in the space where a transform authored on the visual acts:
   * the inherited ancestor space. The coefficients are captured once at
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
 * Where a free drag was released: the question `onDrop` answers.
 *
 * Every point on this surface is in viewport space. Only a delta is offered in
 * the inherited ancestor space. A consumer whose model uses some other space
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
 * Where a rejected or canceled drag returns to. Viewport space, and both
 * coordinates finite, as for every point on this surface.
 *
 * Nothing detects a non-finite coordinate: it composes into the landing target
 * and reaches a renderer as a transform nobody can see. A `null`, a missing
 * field or a throwing accessor is different. The library reads the point while
 * it measures the landing target, so those fail there. `onError` receives a
 * `DraggableWarning` and not a `DraggableError`: the landing is skipped, the
 * committed drop stays settled, and the operation's outcome does not change.
 */
export type ResolveHome = (subject: FreeDragSubject) => Point;

// Erased: `declare const` emits no JavaScript, and no value carries the key. It
// exists to keep the shape below unwritable by anything but the factories.
declare const RESOLUTION: unique symbol;

/**
 * The explicit consumer response. Acceptance is never inferred: not from
 * callback silence, not from DOM mutation, not from elapsed time.
 *
 * The value is opaque and only makes a round trip.
 * {@link FreeDragResolution.accept} or {@link FreeDragResolution.reject} builds
 * it, `onDrop` returns it, and only the library reads it. The verdict reaches
 * the consumer again as a `FreeDragTransactionResult`, which has the fields.
 * Nothing here can be inspected, and nothing here needs to be.
 */
export type FreeDragResolution = Readonly<{ [RESOLUTION]: never }>;

/**
 * The two representations, declared as what they are: a resolution that is also
 * a tuple. The intersection lets the read side name an arm and index it:
 * `settlement.prepare` asserts to `RejectedResolution` and reads slot 0, with
 * no widening through `unknown` on the way.
 *
 * Neither is named outside this package. The entry publishes only
 * {@link FreeDragResolution}, which keeps the value opaque.
 */
export type AcceptedResolution = FreeDragResolution & readonly [];
export type RejectedResolution = FreeDragResolution &
  readonly [reason?: unknown];

/**
 * Acceptance is a shared value: it declares nothing, so there is one of it for
 * the life of the module and an accepted drop allocates nothing at all.
 * Rejection is the same carrier with the reason in it, and the only arm that
 * must be built.
 *
 * Identity is the discriminant, so the empty carrier is a constant and not a
 * new one per acceptance. There is no string to ship or compare, and nothing on
 * the value for a consumer to read or forge.
 *
 * The `as never` assertions on `ACCEPTED` and in `reject` cannot be reduced.
 * The brand is a required property no runtime value carries. That makes the
 * type unforgeable, and it also means an array literal is not comparable to it.
 * `as never` is the narrowest spelling: it asserts nothing about the source,
 * and the annotation beside it states the result.
 */
export const ACCEPTED: AcceptedResolution = [] as never;

/**
 * Both factories take at most a reason, as the sortable's do. Acceptance
 * declares nothing: a consumer that must render before the drop lands `await`s
 * its own commit inside `onDrop`.
 */
export const FreeDragResolution = {
  accept: (): FreeDragResolution => ACCEPTED,
  reject: (reason?: unknown): FreeDragResolution => [reason] as never,
} as const;

/**
 * The consumer round trip. `PromiseLike`, not `Promise`, because the kernel
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
   * `null` exactly when the operation was abandoned before release built one.
   * The sortable's `proposal: null` has the same shape, and this is the reason
   * `stage` is carried.
   */
  request: FreeDragRequest | null;
  /**
   * What the decider had to say, and nothing more. This is an open channel: a
   * value the consumer passed to `requestCancel`, the value a classified
   * failure threw, or `undefined`. This behavior creates no reason of its own.
   * Provenance is `origin`, which the consumer cannot write.
   */
  reason: unknown;
  /** Who decided, and of what kind. Written by the library. */
  origin: CancelOrigin;
  stage: CancelStage;
}>;

/**
 * No identity-preserving arm, unlike the sortable's. A free drag has no
 * identity-preserving success state: `accept()` means keep it where it landed,
 * whether or not it travelled, and a zero-distance drop is an ordinary
 * acceptance.
 */
export type FreeDragTransactionResult =
  | AcceptedFreeDragResult
  | RejectedFreeDragResult
  | CanceledFreeDragResult;
