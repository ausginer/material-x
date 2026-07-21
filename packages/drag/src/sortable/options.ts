/** Public option, controller, and result types for the sortable entry. */
import {
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_NO_OP,
  OUTCOME_REJECTED,
  type CancellationReason,
  type DragErrorContext,
  type ResolutionContext,
} from '../kernel/protocol.ts';
import type {
  AnimationTiming,
  MaybePromise,
  ReorderRequest,
  DragSubject,
} from '../kernel/types.ts';

/* PUBLIC */

/** The explicit consumer response to a reorder. */
export type ReorderResolution =
  | AcceptedReorderResolution
  | RejectedReorderResolution;

export const ReorderResolution = {
  accept: (presentationReady?: PromiseLike<void>): AcceptedReorderResolution =>
    presentationReady
      ? { type: OUTCOME_ACCEPTED, presentationReady }
      : { type: OUTCOME_ACCEPTED },
  reject: (
    reason?: unknown,
    presentationReady?: PromiseLike<void>,
  ): RejectedReorderResolution =>
    presentationReady
      ? { type: OUTCOME_REJECTED, reason, presentationReady }
      : { type: OUTCOME_REJECTED, reason },
} as const;

export type SortableFinishResult =
  | AcceptedReorderTransactionResult
  | NoOpReorderTransactionResult;

export type SortableCancelResult =
  | RejectedReorderTransactionResult
  | CanceledReorderTransactionResult;

export const SortableResult = {
  isAccepted: (
    result: ReorderTransactionResult,
  ): result is AcceptedReorderTransactionResult =>
    result.type === OUTCOME_ACCEPTED,
  isRejected: (
    result: ReorderTransactionResult,
  ): result is RejectedReorderTransactionResult =>
    result.type === OUTCOME_REJECTED,
  isCanceled: (
    result: ReorderTransactionResult,
  ): result is CanceledReorderTransactionResult =>
    result.type === OUTCOME_CANCELED,
  isNoOp: (
    result: ReorderTransactionResult,
  ): result is NoOpReorderTransactionResult => result.type === OUTCOME_NO_OP,
} as const;

/** Geometry passed to a consumer's placeholder factory. */
export type PlaceholderContext = DragSubject &
  Readonly<{
    rect: DOMRectReadOnly;
  }>;

export type SortableOptions = Readonly<{
  /** The current ordered item collection. */
  items(): readonly HTMLElement[];
  /** The lifted element for an item; defaults to the item itself. */
  getVisual?(item: HTMLElement): HTMLElement;
  /** Whether an item requires its press to land on a handle. */
  getHandle?(item: HTMLElement): HTMLElement | null;
  /** Builds the visible placeholder occupying the dragged item's slot. */
  createPlaceholder?(context: PlaceholderContext): HTMLElement;
  /** Activation travel, in viewport pixels. Defaults to 8. */
  threshold?: number;
  /** Landing animation timing, read at settle time. */
  landingTiming?(): AnimationTiming;
  /** Required: the explicit consumer reorder resolution. */
  onReorder: OnReorder;
  onStart?(item: HTMLElement): void;
  onFinish?(result: SortableFinishResult): void;
  onCancel?(result: SortableCancelResult): void;
  onError?(
    error: unknown,
    context: DragErrorContext<ReorderTransactionResult>,
  ): void;
}>;

/* PRIVATE */

/** An immutable ordered snapshot of the collection and its version. */
export type CollectionSnapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;

/** A proposed insertion gap within a destination view of one snapshot. */
export type Insertion = Readonly<{
  version: number;
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

/**
 * The basis owned by an in-flight proposal stabilization. On release (or a
 * keyboard command) the operation's snapshot ownership transfers here, together
 * with the last ready gap as `incumbent`; the stabilization effect resolves the
 * final insertion against `snapshot` before the immutable proposal is built.
 */
export type ProposalBasis = Readonly<{
  snapshot: CollectionSnapshot;
  spatialId: number;
  incumbent: Insertion | null;
}>;

/** An immutable, version-stabilized reorder proposal. */
export type ReorderProposal = Readonly<{
  snapshot: CollectionSnapshot;
  request: ReorderRequest;
}>;

export type AcceptedReorderResolution = Readonly<{
  type: typeof OUTCOME_ACCEPTED;
  /**
   * Resolves once the consumer's *authored* presentation for this outcome has
   * actually been committed. The engine keeps the lift and placeholder in place
   * until it settles (bounded by `PRESENTATION_READY_TIMEOUT`), so the authored
   * DOM is never revealed before it exists.
   *
   * Apply the reorder from `onReorder` and return the promise here — do not
   * `await` it before returning, which would serialize the render ahead of the
   * landing animation instead of overlapping it.
   */
  presentationReady?: PromiseLike<void>;
}>;

export type RejectedReorderResolution = Readonly<{
  type: typeof OUTCOME_REJECTED;
  reason?: unknown;
  /** As {@link AcceptedReorderResolution.presentationReady}, for async rollback. */
  presentationReady?: PromiseLike<void>;
}>;

/** The terminal transaction result carried through settlement. */
export type AcceptedReorderTransactionResult = Readonly<{
  type: typeof OUTCOME_ACCEPTED;
  proposal: ReorderProposal;
}>;

export type RejectedReorderTransactionResult = Readonly<{
  type: typeof OUTCOME_REJECTED;
  reason: typeof REORDER_REJECTION_CONSUMER;
  detail?: unknown;
  proposal: ReorderProposal;
}>;

export type NoOpReorderTransactionResult = Readonly<{
  type: typeof OUTCOME_NO_OP;
  proposal: ReorderProposal;
}>;

export type CanceledReorderTransactionResult = Readonly<{
  type: typeof OUTCOME_CANCELED;
  reason: CancellationReason;
  at: typeof REORDER_CANCELED_AT_PROPOSAL | typeof REORDER_CANCELED_AT_CONSUMER;
  proposal: ReorderProposal | null;
}>;

export type ReorderTransactionResult =
  | AcceptedReorderTransactionResult
  | RejectedReorderTransactionResult
  | NoOpReorderTransactionResult
  | CanceledReorderTransactionResult;

export const REORDER_REJECTION_CONSUMER: unique symbol = Symbol('consumer');
export const REORDER_CANCELED_AT_PROPOSAL: unique symbol = Symbol('proposal');
export const REORDER_CANCELED_AT_CONSUMER: unique symbol = Symbol('consumer');

/** Dedicated signal handed to the reorder resolver. */
export type OnReorder = (
  request: ReorderRequest,
  context: ResolutionContext,
) => MaybePromise<ReorderResolution>;
