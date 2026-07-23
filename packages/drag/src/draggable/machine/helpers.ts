import {
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
  type CancellationReason,
  type FailureCause,
} from '../../kernel/protocol.ts';
import { ignored } from '../../kernel/session.ts';
import type {
  DraggableOptions,
  FreeDropResult,
  ResolveFreeHomeTarget,
} from '../options.ts';
import {
  FINALIZE_OPERATION,
  PREPARE_FREE_LANDING,
  REPORT_FAILURE,
  STOP_INTERACTION,
  WATCH_PRESENTATION,
  type DraggableDecision,
  type DraggableEffect,
  type DraggableMachineConfig,
  type GeometryRequest,
} from './effect.ts';
import {
  DRAG_FINALIZING,
  DRAG_REPORTING_FAILURE,
  DRAG_SETTLING,
  LANDING_ABSENT,
  LANDING_PREPARING,
  LANDING_TERMINAL,
  PRESENTATION_ABSENT,
  PRESENTATION_TERMINAL,
  PRESENTATION_WATCHING,
  type ActiveOperation,
  type DraggableLifecycle,
  type DraggableState,
  type FailureContinuation,
  type LandingGate,
  type OperationCurrency,
  type PendingOperation,
  type PhaseDraggableState,
  type PresentationGate,
  type SettlingLifecycle,
  type TerminalOutcome,
} from './state.ts';

export function sameOperation(
  operation: OperationCurrency,
  event: OperationCurrency,
): boolean {
  return operation.operationId === event.operationId;
}

export function ignoreDraggable(state: DraggableState): DraggableDecision {
  return ignored<DraggableState, DraggableEffect>(state);
}

export function replacePhase<Lifecycle extends DraggableLifecycle>(
  state: DraggableState,
  lifecycle: Lifecycle,
): PhaseDraggableState<Lifecycle> {
  return {
    policy: state.policy,
    nextOperationId: state.nextOperationId,
    ...lifecycle,
  };
}

export function geometryRequest(operation: ActiveOperation): GeometryRequest {
  return {
    pointer: operation.latestPointer,
    originPointer: operation.originPointer,
    viewportDelta: operation.viewportDelta,
    originRect: operation.originRect,
    coordinateSpace: operation.coordinateSpace,
  };
}

function landingTerminal(landing: LandingGate): boolean {
  return landing.stage === LANDING_ABSENT || landing.stage === LANDING_TERMINAL;
}

function presentationTerminal(presentation: PresentationGate): boolean {
  return (
    presentation.stage === PRESENTATION_ABSENT ||
    presentation.stage === PRESENTATION_TERMINAL
  );
}

function settlementReady(lifecycle: SettlingLifecycle): boolean {
  return (
    lifecycle.interactionStopped &&
    landingTerminal(lifecycle.landing) &&
    presentationTerminal(lifecycle.presentation)
  );
}

function nextLanding(
  operation: ActiveOperation,
): readonly [ActiveOperation, LandingGate] {
  const landingId = operation.nextLandingId;
  return [
    { ...operation, nextLandingId: landingId + 1 },
    {
      stage: LANDING_PREPARING,
      currency: { operationId: operation.operationId, landingId },
    },
  ];
}

export function terminalLanding(): LandingGate {
  return { stage: LANDING_TERMINAL };
}

export function terminalPresentation(): PresentationGate {
  return { stage: PRESENTATION_TERMINAL };
}

export function createSettlement(
  operation: ActiveOperation,
  outcome: TerminalOutcome,
  recovery: typeof RECOVERY_HOME | typeof RECOVERY_IMMEDIATE,
  presentation: PresentationGate,
): SettlingLifecycle {
  if (recovery === RECOVERY_IMMEDIATE) {
    return {
      phase: DRAG_SETTLING,
      operation,
      outcome,
      recovery,
      interactionStopped: false,
      landing: terminalLanding(),
      presentation,
    };
  }

  const [nextOperation, landing] = nextLanding(operation);
  return {
    phase: DRAG_SETTLING,
    operation: nextOperation,
    outcome,
    recovery,
    interactionStopped: false,
    landing,
    presentation,
  };
}

export function canceledResult(reason: CancellationReason): FreeDropResult {
  return {
    type: OUTCOME_CANCELED,
    reason,
    proposal: null,
  };
}

export function initialSettlementEffects(
  lifecycle: SettlingLifecycle,
  ready: PromiseLike<void> | undefined,
  resolveHomeTarget: ResolveFreeHomeTarget | undefined,
): readonly DraggableEffect[] {
  const effects: DraggableEffect[] = [
    {
      type: STOP_INTERACTION,
      operationId: lifecycle.operation.operationId,
    },
  ];

  if (lifecycle.presentation.stage === PRESENTATION_WATCHING && ready) {
    effects.push({
      type: WATCH_PRESENTATION,
      ...lifecycle.presentation.currency,
      ready,
    });
  }

  if (lifecycle.landing.stage === LANDING_PREPARING && resolveHomeTarget) {
    effects.push({
      type: PREPARE_FREE_LANDING,
      ...lifecycle.landing.currency,
      item: lifecycle.operation.item,
      visual: lifecycle.operation.visual,
      viewportDelta: lifecycle.operation.viewportDelta,
      originRect: lifecycle.operation.originRect,
      resolve: resolveHomeTarget,
    });
  }

  return effects;
}

export function advanceSettlement(
  state: DraggableState,
  lifecycle: SettlingLifecycle,
  config: DraggableMachineConfig,
): DraggableDecision {
  if (settlementReady(lifecycle)) {
    return {
      state: replacePhase(state, {
        phase: DRAG_FINALIZING,
        operation: lifecycle.operation,
        terminal: lifecycle.outcome,
      }),
      effects: {
        type: FINALIZE_OPERATION,
        operationId: lifecycle.operation.operationId,
        terminal: lifecycle.outcome,
        onFinish: config.onFinish,
        onCancel: config.onCancel,
      },
    };
  }

  return {
    state: replacePhase(state, lifecycle),
    effects: null,
  };
}

export function reportFailure(
  state: DraggableState,
  operation: ActiveOperation | PendingOperation,
  cause: FailureCause,
  error: unknown,
  domain: FreeDropResult | null,
  continuation: FailureContinuation,
  onError: DraggableOptions['onError'],
): DraggableDecision {
  return {
    state: replacePhase(state, {
      phase: DRAG_REPORTING_FAILURE,
      operation,
      cause,
      error,
      domain,
      continuation,
    }),
    effects: {
      type: REPORT_FAILURE,
      operationId: operation.operationId,
      cause,
      error,
      domain,
      callback: onError,
    },
  };
}

export function failedSettlement(
  operation: ActiveOperation,
  domain: FreeDropResult | null,
  hasHomeTarget: boolean,
): SettlingLifecycle {
  return createSettlement(
    operation,
    { result: OUTCOME_FAILED, domain },
    hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
    terminalPresentation(),
  );
}
