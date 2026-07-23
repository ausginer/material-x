import {
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_PRESENTATION_READY,
  OUTCOME_FAILED,
  RECOVERY_IMMEDIATE,
} from '../../kernel/protocol.ts';
import {
  FINALIZE_OPERATION,
  PIN_LANDING,
  START_LANDING,
  type SortableDecision,
  type SortableMachineConfig,
} from './effect.ts';
import {
  INTERACTION_STOPPED,
  LANDING_FAILED,
  LANDING_FINISHED,
  LANDING_PIN_FAILED,
  LANDING_PINNED,
  LANDING_PLAN_FAILED,
  LANDING_PLAN_RESOLVED,
  LANDING_START_FAILED,
  LANDING_STARTED,
  PRESENTATION_FAILED,
  PRESENTATION_SETTLED,
  type SortableEvent,
} from './event.ts';
import { ignoreSortable, reportFailure } from './helpers.ts';
import {
  LANDING_COMPLETING,
  LANDING_PREPARING,
  LANDING_RUNNING,
  LANDING_STARTING,
  LANDING_TERMINAL,
  PRESENTATION_TERMINAL,
  PRESENTATION_WATCHING,
  SORTABLE_FINALIZING,
  type SettlingSortableState,
} from './state.ts';

function advance(
  _: SettlingSortableState,
  next: SettlingSortableState,
  config: SortableMachineConfig,
): SortableDecision {
  if (
    next.interactionStopped &&
    next.landing.stage === LANDING_TERMINAL &&
    next.presentation.stage !== PRESENTATION_WATCHING
  ) {
    return {
      state: {
        phase: SORTABLE_FINALIZING,
        nextOperationId: next.nextOperationId,
        operation: next.operation,
        terminal: next.outcome,
      },
      effects: {
        type: FINALIZE_OPERATION,
        operationId: next.operation.operationId,
        terminal: next.outcome,
        onFinish: config.onFinish,
        onCancel: config.onCancel,
      },
    };
  }
  return { state: next, effects: null };
}

function landingMatches(
  state: SettlingSortableState,
  event: SortableEvent,
): boolean {
  return (
    'currency' in state.landing &&
    'landingId' in event &&
    event.operationId === state.landing.currency.operationId &&
    event.landingId === state.landing.currency.landingId
  );
}

export function decideSettling(
  state: SettlingSortableState,
  event: SortableEvent,
  config: SortableMachineConfig,
): SortableDecision {
  if (
    event.type === INTERACTION_STOPPED &&
    event.operationId === state.operation.operationId
  ) {
    return advance(state, { ...state, interactionStopped: true }, config);
  }

  if (
    event.type === PRESENTATION_SETTLED &&
    state.presentation.stage === PRESENTATION_WATCHING &&
    event.operationId === state.presentation.currency.operationId &&
    event.resolutionId === state.presentation.currency.resolutionId
  ) {
    if (event.error !== undefined) {
      return reportFailure(
        state,
        state.operation,
        { stage: FAILURE_PRESENTATION_READY },
        event.error,
        state.outcome.domain,
        {
          ...state,
          outcome: { result: OUTCOME_FAILED, domain: state.outcome.domain },
          recovery: RECOVERY_IMMEDIATE,
          landing: { stage: LANDING_TERMINAL },
          presentation: { stage: PRESENTATION_TERMINAL },
        },
        config,
      );
    }
    return advance(
      state,
      { ...state, presentation: { stage: PRESENTATION_TERMINAL } },
      config,
    );
  }

  if (
    event.type === PRESENTATION_FAILED &&
    event.operationId === state.operation.operationId
  ) {
    return reportFailure(
      state,
      state.operation,
      { stage: FAILURE_PRESENTATION_READY },
      event.error,
      state.outcome.domain,
      {
        ...state,
        outcome: { result: OUTCOME_FAILED, domain: state.outcome.domain },
        recovery: RECOVERY_IMMEDIATE,
        landing: { stage: LANDING_TERMINAL },
        presentation: { stage: PRESENTATION_TERMINAL },
      },
      config,
    );
  }

  if (
    event.type === LANDING_PLAN_RESOLVED &&
    state.landing.stage === LANDING_PREPARING &&
    landingMatches(state, event)
  ) {
    return {
      state: {
        ...state,
        landing: {
          stage: LANDING_STARTING,
          currency: state.landing.currency,
          plan: event.plan,
        },
      },
      effects: {
        type: START_LANDING,
        ...state.landing.currency,
        plan: event.plan,
        timing: config.landingTiming,
      },
    };
  }

  if (
    (event.type === LANDING_PLAN_FAILED ||
      event.type === LANDING_START_FAILED ||
      event.type === LANDING_FAILED ||
      event.type === LANDING_PIN_FAILED) &&
    landingMatches(state, event)
  ) {
    return reportFailure(
      state,
      state.operation,
      { stage: FAILURE_LANDING_INTERRUPTED },
      event.error,
      state.outcome.domain,
      {
        ...state,
        outcome: { result: OUTCOME_FAILED, domain: state.outcome.domain },
        recovery: RECOVERY_IMMEDIATE,
        landing: { stage: LANDING_TERMINAL },
        presentation: { stage: PRESENTATION_TERMINAL },
      },
      config,
    );
  }

  if (
    event.type === LANDING_STARTED &&
    state.landing.stage === LANDING_STARTING &&
    landingMatches(state, event)
  ) {
    return {
      state: {
        ...state,
        landing: { ...state.landing, stage: LANDING_RUNNING },
      },
      effects: null,
    };
  }

  if (
    event.type === LANDING_FINISHED &&
    state.landing.stage === LANDING_RUNNING &&
    landingMatches(state, event)
  ) {
    return {
      state: {
        ...state,
        landing: { ...state.landing, stage: LANDING_COMPLETING },
      },
      effects: { type: PIN_LANDING, ...state.landing.currency },
    };
  }

  if (
    event.type === LANDING_PINNED &&
    state.landing.stage === LANDING_COMPLETING &&
    landingMatches(state, event)
  ) {
    return advance(
      state,
      { ...state, landing: { stage: LANDING_TERMINAL } },
      config,
    );
  }

  return ignoreSortable(state);
}
