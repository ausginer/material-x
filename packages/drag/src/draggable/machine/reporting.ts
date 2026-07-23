import { ignored } from '../../kernel/session.ts';
import {
  PREPARE_FREE_LANDING,
  RETIRE_OPERATION,
  STOP_INTERACTION,
  type DraggableDecision,
  type DraggableEffect,
  type DraggableMachineConfig,
} from './effect.ts';
import { FAILURE_REPORTED, type DraggableEvent } from './event.ts';
import { advanceSettlement, replacePhase, sameOperation } from './helpers.ts';
import {
  DRAG_IDLE,
  LANDING_PREPARING,
  type ReportingDraggableState,
} from './state.ts';

export function decideReporting(
  state: ReportingDraggableState,
  event: DraggableEvent,
  config: DraggableMachineConfig,
): DraggableDecision {
  const lifecycle = state;

  if (
    event.type !== FAILURE_REPORTED ||
    !sameOperation(lifecycle.operation, event)
  ) {
    return ignored(state);
  }

  if (lifecycle.continuation.phase === DRAG_IDLE) {
    return {
      state: replacePhase(state, lifecycle.continuation),
      effects: {
        type: RETIRE_OPERATION,
        operationId: lifecycle.operation.operationId,
      },
    };
  }

  const { continuation } = lifecycle;
  const effects: DraggableEffect[] = [];

  if (!continuation.interactionStopped) {
    effects.push({
      type: STOP_INTERACTION,
      operationId: continuation.operation.operationId,
    });
  }

  if (
    continuation.landing.stage === LANDING_PREPARING &&
    config.resolveHomeTarget
  ) {
    effects.push({
      type: PREPARE_FREE_LANDING,
      ...continuation.landing.currency,
      item: continuation.operation.item,
      visual: continuation.operation.visual,
      viewportDelta: continuation.operation.viewportDelta,
      originRect: continuation.operation.originRect,
      resolve: config.resolveHomeTarget,
    });
  }

  const decision = advanceSettlement(state, continuation, config);

  if (decision.effects) {
    return decision;
  }

  return {
    state: decision.state,
    effects: effects.length === 0 ? null : effects,
  };
}
