import {
  FAILURE_ANIMATION_CREATE,
  FAILURE_HOME_TARGET,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_LANDING_PIN,
  FAILURE_LANDING_TIMING,
  FAILURE_PRESENTATION_READY,
  OUTCOME_FAILED,
  RECOVERY_IMMEDIATE,
  type FailureCause,
} from '../../kernel/protocol.ts';
import { ignored } from '../../kernel/session.ts';
import {
  PIN_LANDING,
  START_LANDING,
  type DraggableDecision,
  type DraggableMachineConfig,
} from './effect.ts';
import {
  INTERACTION_STOPPED,
  LANDING_ANIMATION_FAILED,
  LANDING_FAILED,
  LANDING_FINISHED,
  LANDING_PIN_FAILED,
  LANDING_PINNED,
  LANDING_PLAN_FAILED,
  LANDING_PLAN_RESOLVED,
  LANDING_STARTED,
  LANDING_TIMING_FAILED,
  PRESENTATION_SETTLED,
  type DraggableEvent,
} from './event.ts';
import {
  advanceSettlement,
  failedSettlement,
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
      event.type === LANDING_TIMING_FAILED ||
      event.type === LANDING_ANIMATION_FAILED ||
      event.type === LANDING_FAILED ||
      event.type === LANDING_PIN_FAILED) &&
    'currency' in lifecycle.landing &&
    event.operationId === lifecycle.landing.currency.operationId &&
    event.landingId === lifecycle.landing.currency.landingId
  ) {
    let cause: FailureCause;
    // The check above is already exhaustive
    // oxlint-disable-next-line default-case
    switch (event.type) {
      case LANDING_PLAN_FAILED:
        cause = { stage: FAILURE_HOME_TARGET };
        break;
      case LANDING_TIMING_FAILED:
        cause = { stage: FAILURE_LANDING_TIMING };
        break;
      case LANDING_ANIMATION_FAILED:
        cause = { stage: FAILURE_ANIMATION_CREATE };
        break;
      case LANDING_PIN_FAILED:
        cause = { stage: FAILURE_LANDING_PIN };
        break;
      case LANDING_FAILED:
        cause = { stage: FAILURE_LANDING_INTERRUPTED };
        break;
    }
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

  return ignored(state);
}
