import {
  FAILURE_DROP_RESOLUTION,
  FAILURE_MOVE,
  FAILURE_RENDERER_WRITE,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_REJECTED,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
} from '../../kernel/protocol.ts';
import { ignored } from '../../kernel/session.ts';
import type { FreeDropResult } from '../options.ts';
import {
  OPEN_DROP_RESOLUTION,
  PRESENT_MOTION,
  type DraggableDecision,
  type DraggableMachineConfig,
} from './effect.ts';
import {
  DROP_RESOLUTION_FAILED,
  DROP_RESOLVED,
  MOTION_PRESENTATION_FAILED,
  OPERATION_CANCELED,
  RELEASE_FAILED,
  RELEASE_RESOLVED,
  type DraggableEvent,
} from './event.ts';
import {
  canceledResult,
  createSettlement,
  failedSettlement,
  initialSettlementEffects,
  replacePhase,
  reportFailure,
  sameOperation,
  terminalPresentation,
} from './helpers.ts';
import {
  DRAG_AWAITING_CONSUMER,
  PRESENTATION_WATCHING,
  type ActiveOperation,
  type AwaitingConsumerDraggableState,
  type PresentationGate,
  type ResolvingReleaseDraggableState,
} from './state.ts';

export function decideResolvingRelease(
  state: ResolvingReleaseDraggableState,
  event: DraggableEvent,
  config: DraggableMachineConfig,
): DraggableDecision {
  const lifecycle = state;
  const { operation } = state;

  if (
    event.type === RELEASE_RESOLVED &&
    sameOperation(operation, event) &&
    event.motionId === lifecycle.currency.motionId
  ) {
    const resolutionId = operation.nextResolutionId;
    const nextOperation: ActiveOperation = {
      ...operation,
      latestPointer: lifecycle.point,
      viewportDelta: event.viewportDelta,
      nextResolutionId: resolutionId + 1,
    };
    const currency = {
      operationId: operation.operationId,
      resolutionId,
    };
    return {
      state: replacePhase(state, {
        phase: DRAG_AWAITING_CONSUMER,
        operation: nextOperation,
        currency,
        proposal: event.proposal,
      }),
      effects: [
        {
          type: PRESENT_MOTION,
          operationId: operation.operationId,
          motionId: event.motionId,
          viewportDelta: event.viewportDelta,
        },
        {
          type: OPEN_DROP_RESOLUTION,
          ...currency,
          request: event.proposal.request,
          callback: config.onDrop,
        },
      ],
    };
  }

  if (
    event.type === RELEASE_FAILED &&
    sameOperation(operation, event) &&
    event.motionId === lifecycle.currency.motionId
  ) {
    return reportFailure(
      state,
      operation,
      { stage: FAILURE_MOVE },
      event.error,
      null,
      failedSettlement(operation, null, config.hasHomeTarget),
      config.onError,
    );
  }

  if (event.type === OPERATION_CANCELED) {
    const domain = canceledResult(event.reason);
    const settling = createSettlement(
      operation,
      { result: OUTCOME_CANCELED, domain },
      config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
      terminalPresentation(),
    );
    return {
      state: replacePhase(state, settling),
      effects: initialSettlementEffects(
        settling,
        undefined,
        config.resolveHomeTarget,
      ),
    };
  }

  return ignored(state);
}

export function decideAwaitingConsumer(
  state: AwaitingConsumerDraggableState,
  event: DraggableEvent,
  config: DraggableMachineConfig,
): DraggableDecision {
  const { operation, currency, proposal } = state;

  if (
    event.type === MOTION_PRESENTATION_FAILED &&
    sameOperation(operation, event) &&
    event.motionId === operation.nextMotionId - 1
  ) {
    return reportFailure(
      state,
      operation,
      { stage: FAILURE_RENDERER_WRITE },
      event.error,
      null,
      failedSettlement(operation, null, config.hasHomeTarget),
      config.onError,
    );
  }

  if (
    event.type === DROP_RESOLVED &&
    event.operationId === currency.operationId &&
    event.resolutionId === currency.resolutionId
  ) {
    const accepted = event.resolution.type === OUTCOME_ACCEPTED;
    const domain: FreeDropResult = accepted
      ? { type: OUTCOME_ACCEPTED, proposal }
      : {
          type: OUTCOME_REJECTED,
          proposal,
          reason: event.resolution.reason,
        };
    const ready = event.resolution.presentationReady;
    const presentation: PresentationGate = ready
      ? { stage: PRESENTATION_WATCHING, currency }
      : terminalPresentation();
    const recovery =
      accepted || !config.hasHomeTarget ? RECOVERY_IMMEDIATE : RECOVERY_HOME;
    const settling = createSettlement(
      operation,
      {
        result: accepted ? OUTCOME_ACCEPTED : OUTCOME_REJECTED,
        domain,
      },
      recovery,
      presentation,
    );
    return {
      state: replacePhase(state, settling),
      effects: initialSettlementEffects(
        settling,
        ready,
        config.resolveHomeTarget,
      ),
    };
  }

  if (
    event.type === DROP_RESOLUTION_FAILED &&
    event.operationId === currency.operationId &&
    event.resolutionId === currency.resolutionId
  ) {
    return reportFailure(
      state,
      operation,
      { stage: FAILURE_DROP_RESOLUTION },
      event.error,
      null,
      failedSettlement(operation, null, config.hasHomeTarget),
      config.onError,
    );
  }

  if (event.type === OPERATION_CANCELED) {
    const domain = canceledResult(event.reason);
    const settling = createSettlement(
      operation,
      { result: OUTCOME_CANCELED, domain },
      config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
      terminalPresentation(),
    );
    return {
      state: replacePhase(state, settling),
      effects: initialSettlementEffects(
        settling,
        undefined,
        config.resolveHomeTarget,
      ),
    };
  }

  return ignored(state);
}
