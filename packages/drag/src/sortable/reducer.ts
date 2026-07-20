/**
 * The authoritative sortable root reducer. Mirrors the draggable reducer:
 * classify the event, obtain a phase decision from the shared kernel protocol,
 * then compute each semantic slice through a parallel pure projection over the
 * same immutable `from`, event, classification, and phase. Exactly one complete
 * next state is committed per meaningful transition.
 *
 * Pre-proposal collection replacement uses {@link reconcileCollection} (exact
 * identity-gap rebase or cancel); an immutable proposal is never rebased. Removal
 * of the dragged identity disarms before activation and cancels an active/open
 * intra-collection reorder.
 */
import type { OperationIdentitySource } from '../kernel/operation-id.ts';
import {
  transitionKernelPhase,
  type CancellationReason,
  type DragPhase,
  type FailureCause,
  type LandingPlan,
  type LandingState,
  type LifecycleEvent,
  type PointerState,
  type SettlementRecovery,
  type SettlementState,
} from '../kernel/protocol.ts';
import type { Point } from '../kernel/types.ts';
import { reconcileCollection } from './collection-policy.ts';
import type {
  CollectionSnapshot,
  Insertion,
  ProposalBasis,
  ReorderProposal,
  ReorderResolution,
  ReorderTransactionResult,
} from './options.ts';

export type SortableInput = 'pointer' | 'keyboard';

export type SortableOperation =
  | Readonly<{
      type: 'admitted';
      operationId: number;
      input: SortableInput;
      item: HTMLElement;
      operationCollection: CollectionSnapshot;
    }>
  | Readonly<{
      type: 'candidate' | 'active';
      operationId: number;
      input: SortableInput;
      item: HTMLElement;
      visual: HTMLElement;
      activationVersion: number;
      activationIndex: number;
      operationCollection: CollectionSnapshot | null;
    }>;

export type InsertionState =
  | Readonly<{ type: 'none' }>
  | Readonly<{ type: 'ready'; value: Insertion }>;

export type SortableTransaction =
  | Readonly<{ stage: 'none' }>
  | Readonly<{ stage: 'resolving-proposal'; basis: ProposalBasis }>
  | Readonly<{
      stage: 'proposal-ready';
      proposal: ReorderProposal;
    }>
  | Readonly<{
      stage: 'awaiting-consumer';
      proposal: ReorderProposal;
      operationId: number;
      resolutionId: number;
    }>;

export type SortableState = Readonly<{
  phase: DragPhase;
  pointer: PointerState | null;
  operation: SortableOperation | null;
  insertion: InsertionState;
  transaction: SortableTransaction;
  settlement: SettlementState<ReorderTransactionResult> | null;
}>;

export type SortableCandidate = Readonly<{
  visual: HTMLElement;
  activationVersion: number;
  activationIndex: number;
  insertion: Insertion;
}>;

export type SortableEvent =
  | Readonly<{
      type: 'admit';
      operationId: number;
      input: SortableInput;
      item: HTMLElement;
      pointerId: number;
      point: Point;
      collection: CollectionSnapshot;
    }>
  | Readonly<{ type: 'move'; pointerId: number; point: Point }>
  | Readonly<{ type: 'release'; pointerId: number; point: Point }>
  | Readonly<{ type: 'cancel'; reason: CancellationReason }>
  | Readonly<{ type: 'keyboard-activate'; operationId: number }>
  | Readonly<{
      type: 'keyboard-propose';
      operationId: number;
      insertion: Insertion;
    }>
  | Readonly<{
      type: 'activation-ready';
      operationId: number;
      candidate: SortableCandidate;
    }>
  | Readonly<{ type: 'start-succeeded'; operationId: number }>
  | Readonly<{ type: 'activation-failed'; operationId: number }>
  | Readonly<{
      type: 'insertion-resolved';
      operationId: number;
      insertion: Insertion;
    }>
  | Readonly<{
      type: 'snapshot';
      operationId: number;
      snapshot: CollectionSnapshot;
    }>
  | Readonly<{
      type: 'proposal-built';
      operationId: number;
      proposal: ReorderProposal;
    }>
  | Readonly<{
      type: 'reorder-noop';
      operationId: number;
      proposal: ReorderProposal;
    }>
  | Readonly<{
      type: 'resolution-started';
      operationId: number;
      resolutionId: number;
    }>
  | Readonly<{
      type: 'reorder-resolved';
      operationId: number;
      resolutionId: number;
      resolution: ReorderResolution;
    }>
  | Readonly<{
      type: 'reorder-resolution-failed';
      operationId: number;
      resolutionId: number;
      error: unknown;
    }>
  | Readonly<{
      type: 'effect-failed';
      operationId: number;
      stage: FailureCause['stage'];
      error: unknown;
    }>
  | Readonly<{
      type: 'landing-plan-ready';
      operationId: number;
      landingId: number;
      plan: LandingPlan;
    }>
  | Readonly<{
      type: 'landing-started';
      operationId: number;
      landingId: number;
    }>
  | Readonly<{
      type: 'landing-finished';
      operationId: number;
      landingId: number;
    }>
  | Readonly<{ type: 'landing-pinned'; operationId: number; landingId: number }>
  | Readonly<{
      type: 'settlement-failed';
      operationId: number;
      landingId: number;
      stage: FailureCause['stage'];
      error: unknown;
    }>
  | Readonly<{ type: 'settlement-completed'; operationId: number }>;

export type SortableConfig = Readonly<{ threshold: number }>;

export const INITIAL_SORTABLE_STATE: SortableState = {
  phase: 'idle',
  pointer: null,
  operation: null,
  insertion: { type: 'none' },
  transaction: { stage: 'none' },
  settlement: null,
};

const crossed = (origin: Point, latest: Point, threshold: number): boolean =>
  Math.abs(latest.x - origin.x) >= threshold ||
  Math.abs(latest.y - origin.y) >= threshold;

const ownsPointer = (state: SortableState, pointerId: number): boolean =>
  state.pointer?.id === pointerId;

const isActiveOp = (state: SortableState, operationId: number): boolean =>
  state.operation?.operationId === operationId;

/** Whether `snapshot` still contains the dragged item. */
function contains(snapshot: CollectionSnapshot, item: HTMLElement): boolean {
  return snapshot.items.includes(item);
}

function classify(
  state: SortableState,
  event: SortableEvent,
  config: SortableConfig,
): LifecycleEvent {
  switch (event.type) {
    case 'admit':
      return { kind: state.phase === 'idle' ? 'admit' : 'ignore' };
    case 'move':
      if (!ownsPointer(state, event.pointerId)) {
        return { kind: 'ignore' };
      }
      if (state.phase === 'pending' && state.pointer) {
        return crossed(state.pointer.origin, event.point, config.threshold)
          ? { kind: 'activate' }
          : { kind: 'ignore' };
      }
      return { kind: 'move' };
    case 'release':
      return ownsPointer(state, event.pointerId) && state.phase === 'dragging'
        ? { kind: 'release' }
        : { kind: 'ignore' };
    case 'cancel':
      if (state.phase === 'pending') {
        return { kind: 'disarm' };
      }
      return state.phase === 'dragging' || state.phase === 'awaiting-result'
        ? { kind: 'cancel' }
        : { kind: 'ignore' };
    case 'keyboard-activate':
      // Immediate keyboard activation: admission moved to `pending`, this edge
      // carries it into `activating` without waiting for pointer travel.
      return isActiveOp(state, event.operationId) && state.phase === 'pending'
        ? { kind: 'activate' }
        : { kind: 'ignore' };
    case 'keyboard-propose':
      // The command's destination gap enters proposal stabilization, mirroring a
      // pointer release.
      return isActiveOp(state, event.operationId) && state.phase === 'dragging'
        ? { kind: 'release' }
        : { kind: 'ignore' };
    case 'snapshot':
      // Removal of the dragged item is a phase-sensitive classification.
      if (!isActiveOp(state, event.operationId) || !state.operation) {
        return { kind: 'ignore' };
      }
      if (!contains(event.snapshot, state.operation.item)) {
        if (state.phase === 'pending' || state.phase === 'activating') {
          return { kind: 'disarm' };
        }
        if (state.phase === 'dragging' || state.phase === 'awaiting-result') {
          return { kind: 'cancel' };
        }
      }
      return { kind: 'ignore' };
    case 'activation-ready':
      return isActiveOp(state, event.operationId)
        ? { kind: 'activation-ready' }
        : { kind: 'ignore' };
    case 'start-succeeded':
      return isActiveOp(state, event.operationId)
        ? { kind: 'start-succeeded' }
        : { kind: 'ignore' };
    case 'activation-failed':
      return isActiveOp(state, event.operationId)
        ? { kind: 'activation-failed' }
        : { kind: 'ignore' };
    case 'effect-failed':
      return isActiveOp(state, event.operationId) &&
        (state.phase === 'dragging' || state.phase === 'awaiting-result')
        ? { kind: 'cancel' }
        : { kind: 'ignore' };
    case 'proposal-built':
    case 'insertion-resolved':
      return { kind: 'ignore' };
    case 'reorder-noop':
      // An engine-owned no-op moves straight from stabilization into settling.
      return isActiveOp(state, event.operationId) &&
        state.phase === 'awaiting-result' &&
        state.transaction.stage === 'resolving-proposal'
        ? { kind: 'resolved' }
        : { kind: 'ignore' };
    case 'resolution-started':
      return { kind: 'ignore' };
    case 'reorder-resolved':
    case 'reorder-resolution-failed':
      return isActiveOp(state, event.operationId) &&
        state.phase === 'awaiting-result' &&
        state.transaction.stage === 'awaiting-consumer' &&
        state.transaction.resolutionId === event.resolutionId
        ? { kind: 'resolved' }
        : { kind: 'ignore' };
    case 'landing-pinned':
    case 'settlement-completed':
      return { kind: 'settle-complete' };
    case 'landing-plan-ready':
    case 'landing-started':
    case 'landing-finished':
    case 'settlement-failed':
      return { kind: 'settle-progress' };
    default:
      return { kind: 'ignore' };
  }
}

function outcomeOf(
  domain: ReorderTransactionResult,
): SettlementState<ReorderTransactionResult>['outcome'] {
  switch (domain.type) {
    case 'accepted':
      return { result: 'accepted' };
    case 'no-op':
      return { result: 'no-op' };
    case 'rejected':
      return { result: 'rejected' };
    case 'canceled':
      return { result: 'canceled', reason: domain.reason };
    default:
      return { result: 'no-op' };
  }
}

function skipped(
  domain: ReorderTransactionResult,
): SettlementState<ReorderTransactionResult> {
  const recovery: SettlementRecovery =
    domain.type === 'accepted' ? 'destination' : 'home';
  return {
    outcome: outcomeOf(domain),
    recovery,
    domain,
    landing: { stage: 'skipped' },
  };
}

function preparingLanding(
  ids: OperationIdentitySource,
  operationId: number,
): LandingState {
  return {
    stage: 'preparing',
    currency: { operationId, landingId: ids.next() },
    plan: null,
  };
}

function landed(
  domain: ReorderTransactionResult,
  ids: OperationIdentitySource,
  operationId: number,
): SettlementState<ReorderTransactionResult> {
  return {
    outcome: outcomeOf(domain),
    recovery: 'destination',
    domain,
    landing: preparingLanding(ids, operationId),
  };
}

/**
 * A rejected/canceled transaction that still owns a live placeholder animates
 * the visual home rather than snapping. The placeholder is returned to the home
 * slot at plan time; the plan targets the grab origin.
 */
function rolledBack(
  domain: ReorderTransactionResult,
  ids: OperationIdentitySource,
  operationId: number,
): SettlementState<ReorderTransactionResult> {
  return {
    outcome: outcomeOf(domain),
    recovery: 'home',
    domain,
    landing: preparingLanding(ids, operationId),
  };
}

function progressSettling(
  settlement: SettlementState<ReorderTransactionResult> | null,
  event: SortableEvent,
): SettlementState<ReorderTransactionResult> | null {
  if (!settlement) {
    return settlement;
  }
  const { landing } = settlement;

  if (
    event.type === 'landing-plan-ready' &&
    landing.stage === 'preparing' &&
    landing.currency.landingId === event.landingId
  ) {
    return {
      ...settlement,
      landing: {
        stage: 'preparing',
        currency: landing.currency,
        plan: event.plan,
      },
    };
  }
  if (
    event.type === 'landing-started' &&
    landing.stage === 'preparing' &&
    landing.plan &&
    landing.currency.landingId === event.landingId
  ) {
    return {
      ...settlement,
      landing: {
        stage: 'running',
        currency: landing.currency,
        plan: landing.plan,
      },
    };
  }
  if (
    event.type === 'landing-finished' &&
    landing.stage === 'running' &&
    landing.currency.landingId === event.landingId
  ) {
    return {
      ...settlement,
      landing: {
        stage: 'completing',
        currency: landing.currency,
        plan: landing.plan,
      },
    };
  }
  if (
    event.type === 'settlement-failed' &&
    landing.stage !== 'skipped' &&
    landing.currency.landingId === event.landingId
  ) {
    return {
      outcome: { result: 'failed', failure: { stage: event.stage } },
      recovery: 'immediate',
      domain: settlement.domain,
      landing: { stage: 'skipped' },
    };
  }
  return settlement;
}

function enterSettling(
  from: SortableState,
  event: SortableEvent,
  ids: OperationIdentitySource,
): SettlementState<ReorderTransactionResult> {
  const operationId = from.operation?.operationId ?? 0;
  const proposal =
    from.transaction.stage === 'proposal-ready' ||
    from.transaction.stage === 'awaiting-consumer'
      ? from.transaction.proposal
      : null;

  // A no-op arrives straight from stabilization and carries its own proposal.
  if (event.type === 'reorder-noop') {
    return skipped({ type: 'no-op', proposal: event.proposal });
  }

  if (event.type === 'reorder-resolved' && proposal) {
    if (event.resolution.type === 'accepted') {
      return landed({ type: 'accepted', proposal }, ids, operationId);
    }
    return rolledBack(
      {
        type: 'rejected',
        reason: 'consumer',
        detail: event.resolution.reason,
        proposal,
      },
      ids,
      operationId,
    );
  }

  if (event.type === 'reorder-resolution-failed') {
    return {
      outcome: { result: 'failed', failure: { stage: 'reorder-resolution' } },
      recovery: 'immediate',
      domain: null,
      landing: { stage: 'skipped' },
    };
  }

  if (event.type === 'effect-failed') {
    return {
      outcome: { result: 'failed', failure: { stage: event.stage } },
      recovery: 'immediate',
      domain: null,
      landing: { stage: 'skipped' },
    };
  }

  const reason: CancellationReason =
    event.type === 'cancel' ? event.reason : { type: 'escape' };
  return rolledBack(
    {
      type: 'canceled',
      reason,
      at: proposal ? 'consumer' : 'proposal',
      proposal,
    },
    ids,
    operationId,
  );
}

export function createSortableReducer(
  config: SortableConfig,
  ids: OperationIdentitySource,
): (from: SortableState, event: SortableEvent) => SortableState {
  const reducePointer = (
    from: SortableState,
    event: SortableEvent,
    phase: DragPhase,
  ): PointerState | null => {
    if (phase === 'idle') {
      return null;
    }
    if (event.type === 'admit') {
      return {
        id: event.pointerId,
        origin: event.point,
        latest: event.point,
        release: null,
      };
    }
    if (!from.pointer) {
      return from.pointer;
    }
    if (event.type === 'move' && ownsPointer(from, event.pointerId)) {
      return { ...from.pointer, latest: event.point };
    }
    if (event.type === 'release' && ownsPointer(from, event.pointerId)) {
      return { ...from.pointer, latest: event.point, release: event.point };
    }
    return from.pointer;
  };

  const reduceOperation = (
    from: SortableState,
    event: SortableEvent,
    phase: DragPhase,
  ): SortableOperation | null => {
    if (phase === 'idle') {
      return null;
    }
    if (event.type === 'admit') {
      return {
        type: 'admitted',
        operationId: event.operationId,
        input: event.input,
        item: event.item,
        operationCollection: event.collection,
      };
    }
    const op = from.operation;
    if (!op) {
      return op;
    }
    if (
      event.type === 'activation-ready' &&
      isActiveOp(from, event.operationId)
    ) {
      return {
        type: 'candidate',
        operationId: op.operationId,
        input: op.input,
        item: op.item,
        visual: event.candidate.visual,
        activationVersion: event.candidate.activationVersion,
        activationIndex: event.candidate.activationIndex,
        operationCollection:
          op.type === 'admitted'
            ? op.operationCollection
            : op.operationCollection,
      };
    }
    if (
      event.type === 'start-succeeded' &&
      isActiveOp(from, event.operationId) &&
      op.type === 'candidate'
    ) {
      return { ...op, type: 'active' };
    }
    if (
      event.type === 'snapshot' &&
      isActiveOp(from, event.operationId) &&
      op.type !== 'admitted'
    ) {
      // Adopt the replacement snapshot as the operation collection (pre-proposal).
      if (
        from.transaction.stage === 'none' &&
        contains(event.snapshot, op.item)
      ) {
        return { ...op, operationCollection: event.snapshot };
      }
    }
    // On release or a keyboard command, the operation's snapshot ownership
    // transfers into the proposal basis; the operation no longer holds it.
    if (
      (event.type === 'release' || event.type === 'keyboard-propose') &&
      phase === 'awaiting-result' &&
      from.phase === 'dragging' &&
      op.type !== 'admitted'
    ) {
      return { ...op, operationCollection: null };
    }
    return op;
  };

  const reduceInsertion = (
    from: SortableState,
    event: SortableEvent,
    phase: DragPhase,
  ): InsertionState => {
    // The active insertion slice is meaningful only while dragging; on release
    // its last ready gap has already transferred into the proposal basis.
    if (
      phase === 'idle' ||
      phase === 'settling' ||
      phase === 'awaiting-result'
    ) {
      return from.insertion.type === 'none' ? from.insertion : { type: 'none' };
    }
    if (
      event.type === 'activation-ready' &&
      isActiveOp(from, event.operationId)
    ) {
      return { type: 'ready', value: event.candidate.insertion };
    }
    if (
      event.type === 'insertion-resolved' &&
      isActiveOp(from, event.operationId) &&
      phase === 'dragging'
    ) {
      return { type: 'ready', value: event.insertion };
    }
    if (
      event.type === 'snapshot' &&
      isActiveOp(from, event.operationId) &&
      from.transaction.stage === 'none'
    ) {
      const op = from.operation;
      if (
        op &&
        contains(event.snapshot, op.item) &&
        from.insertion.type === 'ready'
      ) {
        const change = reconcileCollection(
          event.snapshot,
          op.item,
          from.insertion.value,
        );
        return change.type === 'rebase'
          ? { type: 'ready', value: change.insertion }
          : from.insertion;
      }
    }
    return from.insertion;
  };

  const reduceTransaction = (
    from: SortableState,
    event: SortableEvent,
    phase: DragPhase,
  ): SortableTransaction => {
    if (phase === 'idle' || phase === 'settling') {
      return from.transaction.stage === 'none'
        ? from.transaction
        : { stage: 'none' };
    }
    // Release (or a keyboard command) transfers the operation's snapshot into a
    // fresh proposal basis, carrying the last ready gap as the incumbent.
    if (
      (event.type === 'release' || event.type === 'keyboard-propose') &&
      phase === 'awaiting-result' &&
      from.phase === 'dragging' &&
      from.operation?.type !== 'admitted' &&
      from.operation?.operationCollection
    ) {
      const incumbent =
        event.type === 'keyboard-propose'
          ? event.insertion
          : from.insertion.type === 'ready'
            ? from.insertion.value
            : null;
      return {
        stage: 'resolving-proposal',
        basis: {
          snapshot: from.operation.operationCollection,
          spatialId: ids.next(),
          incumbent,
        },
      };
    }
    if (
      event.type === 'proposal-built' &&
      isActiveOp(from, event.operationId) &&
      from.transaction.stage === 'resolving-proposal'
    ) {
      return { stage: 'proposal-ready', proposal: event.proposal };
    }
    if (
      event.type === 'resolution-started' &&
      isActiveOp(from, event.operationId) &&
      from.transaction.stage === 'proposal-ready'
    ) {
      return {
        stage: 'awaiting-consumer',
        proposal: from.transaction.proposal,
        operationId: event.operationId,
        resolutionId: event.resolutionId,
      };
    }
    return from.transaction;
  };

  const reduceSettlement = (
    from: SortableState,
    event: SortableEvent,
    phase: DragPhase,
  ): SettlementState<ReorderTransactionResult> | null => {
    if (phase === 'idle') {
      return null;
    }
    if (phase !== 'settling') {
      return from.settlement;
    }
    if (from.phase !== 'settling') {
      return enterSettling(from, event, ids);
    }
    return progressSettling(from.settlement, event);
  };

  return (from, event) => {
    const lifecycle = classify(from, event, config);
    const phase = transitionKernelPhase(from.phase, lifecycle);

    const pointer = reducePointer(from, event, phase);
    const operation = reduceOperation(from, event, phase);
    const insertion = reduceInsertion(from, event, phase);
    const transaction = reduceTransaction(from, event, phase);
    const settlement = reduceSettlement(from, event, phase);

    if (
      phase === from.phase &&
      pointer === from.pointer &&
      operation === from.operation &&
      insertion === from.insertion &&
      transaction === from.transaction &&
      settlement === from.settlement
    ) {
      return from;
    }

    return { phase, pointer, operation, insertion, transaction, settlement };
  };
}
