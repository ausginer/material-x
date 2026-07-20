/** Public option, controller, and result types for the sortable entry. */
import type {
  CancellationReason,
  DragErrorContext,
  ResolutionContext,
} from '../kernel/protocol.ts';
import type {
  AnimationTiming,
  MaybePromise,
  ReorderRequest,
} from '../kernel/types.ts';

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

/** The explicit consumer response to a reorder. */
export type ReorderResolution =
  | Readonly<{ type: 'accepted' }>
  | Readonly<{ type: 'rejected'; reason?: unknown }>;

/** The terminal transaction result carried through settlement. */
export type ReorderTransactionResult =
  | Readonly<{ type: 'accepted'; proposal: ReorderProposal }>
  | Readonly<{
      type: 'rejected';
      reason: 'consumer';
      detail?: unknown;
      proposal: ReorderProposal;
    }>
  | Readonly<{ type: 'no-op'; proposal: ReorderProposal }>
  | Readonly<{
      type: 'canceled';
      reason: CancellationReason;
      at: 'proposal' | 'consumer';
      proposal: ReorderProposal | null;
    }>;

export type SortableFinishResult = Extract<
  ReorderTransactionResult,
  { type: 'accepted' | 'no-op' }
>;

export type SortableCancelResult = Extract<
  ReorderTransactionResult,
  { type: 'rejected' | 'canceled' }
>;

/** Dedicated signal handed to the reorder resolver. */
export type OnReorder = (
  request: ReorderRequest,
  context: ResolutionContext,
) => MaybePromise<ReorderResolution>;

/** Geometry passed to a consumer's placeholder factory. */
export type PlaceholderContext = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
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

export type SortableController = Readonly<{
  updateItems(items: readonly HTMLElement[]): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;
