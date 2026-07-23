import {
  FAILURE_HOME_TARGET,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_PRESENTATION_READY,
  OUTCOME_FAILED,
  RECOVERY_IMMEDIATE,
  type FailureCause,
} from '../../kernel/protocol.ts';
import {
  PIN_LANDING,
  START_LANDING,
  type DraggableDecision,
  type DraggableMachineConfig,
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
  PRESENTATION_SETTLED,
  type DraggableEvent,
} from './event.ts';
import {
  advanceSettlement,
  failedSettlement,
  ignoreDraggable,
  replacePhase,
  reportFailure,
  sameOperation,
  terminalLanding,
  terminalPresentation,
} from './helpers.ts';
import {
  LANDING_COMPLETING,
  LANDING_PREPARING,
  LANDING_RUNNING,
  LANDING_STARTING,
  PRESENTATION_WATCHING,
  type SettlingDraggableState,
  type SettlingLifecycle,
} from './state.ts';

export function decideSettling(
  state: SettlingDraggableState,
  event: DraggableEvent,
  config: DraggableMachineConfig,
): DraggableDecision {
  const lifecycle = state;
  const { operation } = state;

  if (event.type === INTERACTION_STOPPED && sameOperation(operation, event)) {
    return advanceSettlement(
      state,
      { ...lifecycle, interactionStopped: true },
      config,
    );
  }

  if (
    event.type === PRESENTATION_SETTLED &&
    lifecycle.presentation.stage === PRESENTATION_WATCHING &&
    event.operationId === lifecycle.presentation.currency.operationId &&
    event.resolutionId === lifecycle.presentation.currency.resolutionId
  ) {
    if (event.error !== null) {
      const replacement = failedSettlement(
        operation,
        lifecycle.outcome.domain,
        config.hasHomeTarget,
      );
      const continuation = {
        ...replacement,
        interactionStopped: lifecycle.interactionStopped,
      };
      return reportFailure(
        state,
        continuation.operation,
        { stage: FAILURE_PRESENTATION_READY },
        event.error,
        lifecycle.outcome.domain,
        continuation,
        config.onError,
      );
    }

    return advanceSettlement(
      state,
      {
        ...lifecycle,
        presentation: terminalPresentation(),
      },
      config,
    );
  }

  if (
    event.type === LANDING_PLAN_RESOLVED &&
    lifecycle.landing.stage === LANDING_PREPARING &&
    event.operationId === lifecycle.landing.currency.operationId &&
    event.landingId === lifecycle.landing.currency.landingId
  ) {
    const nextLifecycle: SettlingLifecycle = {
      ...lifecycle,
      landing: {
        stage: LANDING_STARTING,
        currency: lifecycle.landing.currency,
        plan: event.plan,
      },
    };
    return {
      state: replacePhase(state, nextLifecycle),
      effects: {
        type: START_LANDING,
        ...lifecycle.landing.currency,
        plan: event.plan,
        timing: state.policy.landingTiming,
      },
    };
  }

  if (
    (event.type === LANDING_PLAN_FAILED ||
      event.type === LANDING_START_FAILED ||
      event.type === LANDING_FAILED ||
      event.type === LANDING_PIN_FAILED) &&
    'currency' in lifecycle.landing &&
    event.operationId === lifecycle.landing.currency.operationId &&
    event.landingId === lifecycle.landing.currency.landingId
  ) {
    const cause: FailureCause =
      event.type === LANDING_PLAN_FAILED
        ? { stage: FAILURE_HOME_TARGET }
        : { stage: FAILURE_LANDING_INTERRUPTED };
    const continuation: SettlingLifecycle = {
      phase: lifecycle.phase,
      operation,
      outcome: {
        result: OUTCOME_FAILED,
        domain: lifecycle.outcome.domain,
      },
      recovery: RECOVERY_IMMEDIATE,
      interactionStopped: lifecycle.interactionStopped,
      landing: terminalLanding(),
      presentation: terminalPresentation(),
    };
    return reportFailure(
      state,
      operation,
      cause,
      event.error,
      lifecycle.outcome.domain,
      continuation,
      config.onError,
    );
  }

  if (
    event.type === LANDING_STARTED &&
    lifecycle.landing.stage === LANDING_STARTING &&
    event.operationId === lifecycle.landing.currency.operationId &&
    event.landingId === lifecycle.landing.currency.landingId
  ) {
    return {
      state: replacePhase(state, {
        ...lifecycle,
        landing: {
          ...lifecycle.landing,
          stage: LANDING_RUNNING,
        },
      }),
      effects: null,
    };
  }

  if (
    event.type === LANDING_FINISHED &&
    lifecycle.landing.stage === LANDING_RUNNING &&
    event.operationId === lifecycle.landing.currency.operationId &&
    event.landingId === lifecycle.landing.currency.landingId
  ) {
    const nextLifecycle: SettlingLifecycle = {
      ...lifecycle,
      landing: {
        ...lifecycle.landing,
        stage: LANDING_COMPLETING,
      },
    };
    return {
      state: replacePhase(state, nextLifecycle),
      effects: {
        type: PIN_LANDING,
        ...lifecycle.landing.currency,
      },
    };
  }

  if (
    event.type === LANDING_PINNED &&
    lifecycle.landing.stage === LANDING_COMPLETING &&
    event.operationId === lifecycle.landing.currency.operationId &&
    event.landingId === lifecycle.landing.currency.landingId
  ) {
    return advanceSettlement(
      state,
      { ...lifecycle, landing: terminalLanding() },
      config,
    );
  }

  return ignoreDraggable(state);
}
