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
  LIFECYCLE_ACTIVATE,
  LIFECYCLE_ACTIVATION_FAILED,
  LIFECYCLE_ACTIVATION_READY,
  LIFECYCLE_ADMIT,
  LIFECYCLE_CANCEL,
  CANCEL_ESCAPE,
  LIFECYCLE_DISARM,
  FAILURE_REORDER_RESOLUTION,
  LIFECYCLE_IGNORE,
  LANDING_COMPLETING,
  LANDING_PREPARING,
  LANDING_RUNNING,
  LANDING_SKIPPED,
  LIFECYCLE_MOVE,
  OPERATION_ACTIVE,
  OPERATION_ADMITTED,
  OPERATION_CANDIDATE,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  OUTCOME_NO_OP,
  OUTCOME_REJECTED,
  PHASE_ACTIVATING,
  PHASE_AWAITING_RESULT,
  PHASE_DRAGGING,
  PHASE_IDLE,
  PHASE_PENDING,
  PHASE_SETTLING,
  RECOVERY_DESTINATION,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
  LIFECYCLE_RELEASE,
  LIFECYCLE_RESOLVED,
  LIFECYCLE_SETTLE_COMPLETE,
  LIFECYCLE_SETTLE_PROGRESS,
  LIFECYCLE_START_SUCCEEDED,
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
  type SettlementOutcome,
} from '../kernel/protocol.ts';
import type { Point } from '../kernel/types.ts';
import { CHANGE_REBASE, reconcileCollection } from './collection-policy.ts';
import {
  REORDER_CANCELED_AT_CONSUMER,
  REORDER_CANCELED_AT_PROPOSAL,
  REORDER_REJECTION_CONSUMER,
  type CollectionSnapshot,
  type Insertion,
  type ProposalBasis,
  type ReorderProposal,
  type ReorderResolution,
  type ReorderTransactionResult,
} from './options.ts';

export const INPUT_POINTER: unique symbol = Symbol('pointer');
export const INPUT_KEYBOARD: unique symbol = Symbol('keyboard');

export const EFFECT_FAILED: unique symbol = Symbol('effect-failed');
export const KEYBOARD_ACTIVATE: unique symbol = Symbol('keyboard-activate');
export const KEYBOARD_PROPOSE: unique symbol = Symbol('keyboard-propose');
export const INSERTION_RESOLVED: unique symbol = Symbol('insertion-resolved');
export const SNAPSHOT: unique symbol = Symbol('snapshot');
export const PROPOSAL_BUILT: unique symbol = Symbol('proposal-built');
export const REORDER_NOOP: unique symbol = Symbol('reorder-noop');
export const RESOLUTION_STARTED: unique symbol = Symbol('resolution-started');
export const REORDER_RESOLVED: unique symbol = Symbol('reorder-resolved');
export const REORDER_RESOLUTION_FAILED: unique symbol = Symbol(
  'reorder-resolution-failed',
);
export const LANDING_PLAN_READY: unique symbol = Symbol('landing-plan-ready');
export const LANDING_STARTED: unique symbol = Symbol('landing-started');
export const LANDING_FINISHED: unique symbol = Symbol('landing-finished');
export const LANDING_PINNED: unique symbol = Symbol('landing-pinned');
export const SETTLEMENT_FAILED: unique symbol = Symbol('settlement-failed');
export const SETTLEMENT_COMPLETED: unique symbol = Symbol(
  'settlement-completed',
);

export type SortableInput = typeof INPUT_POINTER | typeof INPUT_KEYBOARD;

export type SortableOperation =
  | Readonly<{
      type: typeof OPERATION_ADMITTED;
      operationId: number;
      input: SortableInput;
      item: HTMLElement;
      operationCollection: CollectionSnapshot;
    }>
  | Readonly<{
      type: typeof OPERATION_CANDIDATE | typeof OPERATION_ACTIVE;
      operationId: number;
      input: SortableInput;
      item: HTMLElement;
      visual: HTMLElement;
      activationVersion: number;
      activationIndex: number;
      operationCollection: CollectionSnapshot | null;
    }>;

export const INSERTION_NONE: unique symbol = Symbol('none');
export const INSERTION_READY: unique symbol = Symbol('ready');

export type InsertionState =
  | Readonly<{ type: typeof INSERTION_NONE }>
  | Readonly<{ type: typeof INSERTION_READY; value: Insertion }>;

export const TRANSACTION_NONE: unique symbol = Symbol('none');
export const TRANSACTION_RESOLVING_PROPOSAL: unique symbol =
  Symbol('resolving-proposal');
export const TRANSACTION_PROPOSAL_READY: unique symbol =
  Symbol('proposal-ready');
export const TRANSACTION_AWAITING_CONSUMER: unique symbol =
  Symbol('awaiting-consumer');

export type SortableTransaction =
  | Readonly<{ stage: typeof TRANSACTION_NONE }>
  | Readonly<{
      stage: typeof TRANSACTION_RESOLVING_PROPOSAL;
      basis: ProposalBasis;
    }>
  | Readonly<{
      stage: typeof TRANSACTION_PROPOSAL_READY;
      proposal: ReorderProposal;
    }>
  | Readonly<{
      stage: typeof TRANSACTION_AWAITING_CONSUMER;
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
      type: typeof LIFECYCLE_ADMIT;
      operationId: number;
      input: SortableInput;
      item: HTMLElement;
      pointerId: number;
      point: Point;
      collection: CollectionSnapshot;
    }>
  | Readonly<{ type: typeof LIFECYCLE_MOVE; pointerId: number; point: Point }>
  | Readonly<{
      type: typeof LIFECYCLE_RELEASE;
      pointerId: number;
      point: Point;
    }>
  | Readonly<{ type: typeof LIFECYCLE_CANCEL; reason: CancellationReason }>
  | Readonly<{ type: typeof KEYBOARD_ACTIVATE; operationId: number }>
  | Readonly<{
      type: typeof KEYBOARD_PROPOSE;
      operationId: number;
      insertion: Insertion;
    }>
  | Readonly<{
      type: typeof LIFECYCLE_ACTIVATION_READY;
      operationId: number;
      candidate: SortableCandidate;
    }>
  | Readonly<{ type: typeof LIFECYCLE_START_SUCCEEDED; operationId: number }>
  | Readonly<{ type: typeof LIFECYCLE_ACTIVATION_FAILED; operationId: number }>
  | Readonly<{
      type: typeof INSERTION_RESOLVED;
      operationId: number;
      insertion: Insertion;
    }>
  | Readonly<{
      type: typeof SNAPSHOT;
      operationId: number;
      snapshot: CollectionSnapshot;
    }>
  | Readonly<{
      type: typeof PROPOSAL_BUILT;
      operationId: number;
      proposal: ReorderProposal;
    }>
  | Readonly<{
      type: typeof REORDER_NOOP;
      operationId: number;
      proposal: ReorderProposal;
    }>
  | Readonly<{
      type: typeof RESOLUTION_STARTED;
      operationId: number;
      resolutionId: number;
    }>
  | Readonly<{
      type: typeof REORDER_RESOLVED;
      operationId: number;
      resolutionId: number;
      resolution: ReorderResolution;
    }>
  | Readonly<{
      type: typeof REORDER_RESOLUTION_FAILED;
      operationId: number;
      resolutionId: number;
      error: unknown;
    }>
  | Readonly<{
      type: typeof EFFECT_FAILED;
      operationId: number;
      stage: FailureCause['stage'];
      error: unknown;
    }>
  | Readonly<{
      type: typeof LANDING_PLAN_READY;
      operationId: number;
      landingId: number;
      plan: LandingPlan;
    }>
  | Readonly<{
      type: typeof LANDING_STARTED;
      operationId: number;
      landingId: number;
    }>
  | Readonly<{
      type: typeof LANDING_FINISHED;
      operationId: number;
      landingId: number;
    }>
  | Readonly<{
      type: typeof LANDING_PINNED;
      operationId: number;
      landingId: number;
    }>
  | Readonly<{
      type: typeof SETTLEMENT_FAILED;
      operationId: number;
      landingId: number;
      stage: FailureCause['stage'];
      error: unknown;
    }>
  | Readonly<{ type: typeof SETTLEMENT_COMPLETED; operationId: number }>;

export type SortableConfig = Readonly<{ threshold: number }>;

export const INITIAL_SORTABLE_STATE: SortableState = {
  phase: PHASE_IDLE,
  pointer: null,
  operation: null,
  insertion: { type: INSERTION_NONE },
  transaction: { stage: TRANSACTION_NONE },
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
    case LIFECYCLE_ADMIT:
      return state.phase === PHASE_IDLE ? LIFECYCLE_ADMIT : LIFECYCLE_IGNORE;
    case LIFECYCLE_MOVE:
      if (!ownsPointer(state, event.pointerId)) {
        return LIFECYCLE_IGNORE;
      }
      if (state.phase === PHASE_PENDING && state.pointer) {
        return crossed(state.pointer.origin, event.point, config.threshold)
          ? LIFECYCLE_ACTIVATE
          : LIFECYCLE_IGNORE;
      }
      return LIFECYCLE_MOVE;
    case LIFECYCLE_RELEASE:
      return ownsPointer(state, event.pointerId) &&
        state.phase === PHASE_DRAGGING
        ? LIFECYCLE_RELEASE
        : LIFECYCLE_IGNORE;
    case LIFECYCLE_CANCEL:
      if (state.phase === PHASE_PENDING) {
        return LIFECYCLE_DISARM;
      }
      return state.phase === PHASE_DRAGGING ||
        state.phase === PHASE_AWAITING_RESULT
        ? LIFECYCLE_CANCEL
        : LIFECYCLE_IGNORE;
    case KEYBOARD_ACTIVATE:
      // Immediate keyboard activation: admission moved to `pending`, this edge
      // carries it into `activating` without waiting for pointer travel.
      return isActiveOp(state, event.operationId) &&
        state.phase === PHASE_PENDING
        ? LIFECYCLE_ACTIVATE
        : LIFECYCLE_IGNORE;
    case KEYBOARD_PROPOSE:
      // The command's destination gap enters proposal stabilization, mirroring a
      // pointer release.
      return isActiveOp(state, event.operationId) &&
        state.phase === PHASE_DRAGGING
        ? LIFECYCLE_RELEASE
        : LIFECYCLE_IGNORE;
    case SNAPSHOT:
      // Removal of the dragged item is a phase-sensitive classification.
      if (!isActiveOp(state, event.operationId) || !state.operation) {
        return LIFECYCLE_IGNORE;
      }
      if (!contains(event.snapshot, state.operation.item)) {
        if (state.phase === PHASE_PENDING || state.phase === PHASE_ACTIVATING) {
          return LIFECYCLE_DISARM;
        }
        if (
          state.phase === PHASE_DRAGGING ||
          state.phase === PHASE_AWAITING_RESULT
        ) {
          return LIFECYCLE_CANCEL;
        }
      }
      return LIFECYCLE_IGNORE;
    case LIFECYCLE_ACTIVATION_READY:
      return isActiveOp(state, event.operationId)
        ? LIFECYCLE_ACTIVATION_READY
        : LIFECYCLE_IGNORE;
    case LIFECYCLE_START_SUCCEEDED:
      return isActiveOp(state, event.operationId)
        ? LIFECYCLE_START_SUCCEEDED
        : LIFECYCLE_IGNORE;
    case LIFECYCLE_ACTIVATION_FAILED:
      return isActiveOp(state, event.operationId)
        ? LIFECYCLE_ACTIVATION_FAILED
        : LIFECYCLE_IGNORE;
    case EFFECT_FAILED:
      return isActiveOp(state, event.operationId) &&
        (state.phase === PHASE_DRAGGING ||
          state.phase === PHASE_AWAITING_RESULT)
        ? LIFECYCLE_CANCEL
        : LIFECYCLE_IGNORE;
    case PROPOSAL_BUILT:
    case INSERTION_RESOLVED:
      return LIFECYCLE_IGNORE;
    case REORDER_NOOP:
      // An engine-owned no-op moves straight from stabilization into settling.
      return isActiveOp(state, event.operationId) &&
        state.phase === PHASE_AWAITING_RESULT &&
        state.transaction.stage === TRANSACTION_RESOLVING_PROPOSAL
        ? LIFECYCLE_RESOLVED
        : LIFECYCLE_IGNORE;
    case RESOLUTION_STARTED:
      return LIFECYCLE_IGNORE;
    case REORDER_RESOLVED:
    case REORDER_RESOLUTION_FAILED:
      return isActiveOp(state, event.operationId) &&
        state.phase === PHASE_AWAITING_RESULT &&
        state.transaction.stage === TRANSACTION_AWAITING_CONSUMER &&
        state.transaction.resolutionId === event.resolutionId
        ? LIFECYCLE_RESOLVED
        : LIFECYCLE_IGNORE;
    case LANDING_PINNED:
    case SETTLEMENT_COMPLETED:
      return LIFECYCLE_SETTLE_COMPLETE;
    case LANDING_PLAN_READY:
    case LANDING_STARTED:
    case LANDING_FINISHED:
    case SETTLEMENT_FAILED:
      return LIFECYCLE_SETTLE_PROGRESS;
    default:
      return LIFECYCLE_IGNORE;
  }
}

function outcomeOf(domain: ReorderTransactionResult): SettlementOutcome {
  switch (domain.type) {
    case OUTCOME_ACCEPTED:
      return { result: OUTCOME_ACCEPTED };
    case OUTCOME_NO_OP:
      return { result: OUTCOME_NO_OP };
    case OUTCOME_REJECTED:
      return { result: OUTCOME_REJECTED };
    case OUTCOME_CANCELED:
      return { result: OUTCOME_CANCELED, reason: domain.reason };
    default:
      return { result: OUTCOME_NO_OP };
  }
}

function skipped(
  domain: ReorderTransactionResult,
): SettlementState<ReorderTransactionResult> {
  const recovery: SettlementRecovery =
    domain.type === OUTCOME_ACCEPTED ? RECOVERY_DESTINATION : RECOVERY_HOME;
  return {
    outcome: outcomeOf(domain),
    recovery,
    domain,
    landing: { stage: LANDING_SKIPPED },
  };
}

function preparingLanding(
  ids: OperationIdentitySource,
  operationId: number,
): LandingState {
  return {
    stage: LANDING_PREPARING,
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
    recovery: RECOVERY_DESTINATION,
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
    recovery: RECOVERY_HOME,
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
    event.type === LANDING_PLAN_READY &&
    landing.stage === LANDING_PREPARING &&
    landing.currency.landingId === event.landingId
  ) {
    return {
      ...settlement,
      landing: {
        stage: LANDING_PREPARING,
        currency: landing.currency,
        plan: event.plan,
      },
    };
  }
  if (
    event.type === LANDING_STARTED &&
    landing.stage === LANDING_PREPARING &&
    landing.plan &&
    landing.currency.landingId === event.landingId
  ) {
    return {
      ...settlement,
      landing: {
        stage: LANDING_RUNNING,
        currency: landing.currency,
        plan: landing.plan,
      },
    };
  }
  if (
    event.type === LANDING_FINISHED &&
    landing.stage === LANDING_RUNNING &&
    landing.currency.landingId === event.landingId
  ) {
    return {
      ...settlement,
      landing: {
        stage: LANDING_COMPLETING,
        currency: landing.currency,
        plan: landing.plan,
      },
    };
  }
  if (
    event.type === SETTLEMENT_FAILED &&
    landing.stage !== LANDING_SKIPPED &&
    landing.currency.landingId === event.landingId
  ) {
    return {
      outcome: { result: OUTCOME_FAILED, failure: { stage: event.stage } },
      recovery: RECOVERY_IMMEDIATE,
      domain: settlement.domain,
      landing: { stage: LANDING_SKIPPED },
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
    from.transaction.stage === TRANSACTION_PROPOSAL_READY ||
    from.transaction.stage === TRANSACTION_AWAITING_CONSUMER
      ? from.transaction.proposal
      : null;

  // A no-op arrives straight from stabilization and carries its own proposal.
  if (event.type === REORDER_NOOP) {
    return skipped({ type: OUTCOME_NO_OP, proposal: event.proposal });
  }

  if (event.type === REORDER_RESOLVED && proposal) {
    if (event.resolution.type === OUTCOME_ACCEPTED) {
      return landed({ type: OUTCOME_ACCEPTED, proposal }, ids, operationId);
    }
    return rolledBack(
      {
        type: OUTCOME_REJECTED,
        reason: REORDER_REJECTION_CONSUMER,
        detail: event.resolution.reason,
        proposal,
      },
      ids,
      operationId,
    );
  }

  if (event.type === REORDER_RESOLUTION_FAILED) {
    return {
      outcome: {
        result: OUTCOME_FAILED,
        failure: { stage: FAILURE_REORDER_RESOLUTION },
      },
      recovery: RECOVERY_IMMEDIATE,
      domain: null,
      landing: { stage: LANDING_SKIPPED },
    };
  }

  if (event.type === EFFECT_FAILED) {
    return {
      outcome: { result: OUTCOME_FAILED, failure: { stage: event.stage } },
      recovery: RECOVERY_IMMEDIATE,
      domain: null,
      landing: { stage: LANDING_SKIPPED },
    };
  }

  const reason: CancellationReason =
    event.type === LIFECYCLE_CANCEL ? event.reason : { type: CANCEL_ESCAPE };
  return rolledBack(
    {
      type: OUTCOME_CANCELED,
      reason,
      at: proposal
        ? REORDER_CANCELED_AT_CONSUMER
        : REORDER_CANCELED_AT_PROPOSAL,
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
    if (phase === PHASE_IDLE) {
      return null;
    }
    if (event.type === LIFECYCLE_ADMIT) {
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
    if (event.type === LIFECYCLE_MOVE && ownsPointer(from, event.pointerId)) {
      return { ...from.pointer, latest: event.point };
    }
    if (
      event.type === LIFECYCLE_RELEASE &&
      ownsPointer(from, event.pointerId)
    ) {
      return { ...from.pointer, latest: event.point, release: event.point };
    }
    return from.pointer;
  };

  const reduceOperation = (
    from: SortableState,
    event: SortableEvent,
    phase: DragPhase,
  ): SortableOperation | null => {
    if (phase === PHASE_IDLE) {
      return null;
    }
    if (event.type === LIFECYCLE_ADMIT) {
      return {
        type: OPERATION_ADMITTED,
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
      event.type === LIFECYCLE_ACTIVATION_READY &&
      isActiveOp(from, event.operationId)
    ) {
      return {
        type: OPERATION_CANDIDATE,
        operationId: op.operationId,
        input: op.input,
        item: op.item,
        visual: event.candidate.visual,
        activationVersion: event.candidate.activationVersion,
        activationIndex: event.candidate.activationIndex,
        operationCollection:
          op.type === OPERATION_ADMITTED
            ? op.operationCollection
            : op.operationCollection,
      };
    }
    if (
      event.type === LIFECYCLE_START_SUCCEEDED &&
      isActiveOp(from, event.operationId) &&
      op.type === OPERATION_CANDIDATE
    ) {
      return { ...op, type: OPERATION_ACTIVE };
    }
    if (
      event.type === SNAPSHOT &&
      isActiveOp(from, event.operationId) &&
      op.type !== OPERATION_ADMITTED
    ) {
      // Adopt the replacement snapshot as the operation collection (pre-proposal).
      if (
        from.transaction.stage === TRANSACTION_NONE &&
        contains(event.snapshot, op.item)
      ) {
        return { ...op, operationCollection: event.snapshot };
      }
    }
    // On release or a keyboard command, the operation's snapshot ownership
    // transfers into the proposal basis; the operation no longer holds it.
    if (
      (event.type === LIFECYCLE_RELEASE || event.type === KEYBOARD_PROPOSE) &&
      phase === PHASE_AWAITING_RESULT &&
      from.phase === PHASE_DRAGGING &&
      op.type !== OPERATION_ADMITTED
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
      phase === PHASE_IDLE ||
      phase === PHASE_SETTLING ||
      phase === PHASE_AWAITING_RESULT
    ) {
      return from.insertion.type === INSERTION_NONE
        ? from.insertion
        : { type: INSERTION_NONE };
    }
    if (
      event.type === LIFECYCLE_ACTIVATION_READY &&
      isActiveOp(from, event.operationId)
    ) {
      return { type: INSERTION_READY, value: event.candidate.insertion };
    }
    if (
      event.type === INSERTION_RESOLVED &&
      isActiveOp(from, event.operationId) &&
      phase === PHASE_DRAGGING
    ) {
      return { type: INSERTION_READY, value: event.insertion };
    }
    if (
      event.type === SNAPSHOT &&
      isActiveOp(from, event.operationId) &&
      from.transaction.stage === TRANSACTION_NONE
    ) {
      const op = from.operation;
      if (
        op &&
        contains(event.snapshot, op.item) &&
        from.insertion.type === INSERTION_READY
      ) {
        const change = reconcileCollection(
          event.snapshot,
          op.item,
          from.insertion.value,
        );
        return change.type === CHANGE_REBASE
          ? { type: INSERTION_READY, value: change.insertion }
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
    if (phase === PHASE_IDLE || phase === PHASE_SETTLING) {
      return from.transaction.stage === TRANSACTION_NONE
        ? from.transaction
        : { stage: TRANSACTION_NONE };
    }
    // Release (or a keyboard command) transfers the operation's snapshot into a
    // fresh proposal basis, carrying the last ready gap as the incumbent.
    if (
      (event.type === LIFECYCLE_RELEASE || event.type === KEYBOARD_PROPOSE) &&
      phase === PHASE_AWAITING_RESULT &&
      from.phase === PHASE_DRAGGING &&
      from.operation?.type !== OPERATION_ADMITTED &&
      from.operation?.operationCollection
    ) {
      const incumbent =
        event.type === KEYBOARD_PROPOSE
          ? event.insertion
          : from.insertion.type === INSERTION_READY
            ? from.insertion.value
            : null;
      return {
        stage: TRANSACTION_RESOLVING_PROPOSAL,
        basis: {
          snapshot: from.operation.operationCollection,
          spatialId: ids.next(),
          incumbent,
        },
      };
    }
    if (
      event.type === PROPOSAL_BUILT &&
      isActiveOp(from, event.operationId) &&
      from.transaction.stage === TRANSACTION_RESOLVING_PROPOSAL
    ) {
      return { stage: TRANSACTION_PROPOSAL_READY, proposal: event.proposal };
    }
    if (
      event.type === RESOLUTION_STARTED &&
      isActiveOp(from, event.operationId) &&
      from.transaction.stage === TRANSACTION_PROPOSAL_READY
    ) {
      return {
        stage: TRANSACTION_AWAITING_CONSUMER,
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
    if (phase === PHASE_IDLE) {
      return null;
    }
    if (phase !== PHASE_SETTLING) {
      return from.settlement;
    }
    if (from.phase !== PHASE_SETTLING) {
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
