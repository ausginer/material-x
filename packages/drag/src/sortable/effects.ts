import { reportError_ } from '../kernel/errors.ts';
import { createFrameTask, type FrameTask } from '../kernel/invalidation.ts';
import {
  createOperationResources,
  type OperationResources,
} from '../kernel/operation-resources.ts';
import { watchPresentationReady } from '../kernel/presentation-ready.ts';
import {
  CANCEL_ESCAPE,
  CANCEL_POINTER,
  FAILURE_CANCEL_CALLBACK,
  FAILURE_FINISH_CALLBACK,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_NO_OP,
  OUTCOME_REJECTED,
  POINTER_CANCEL,
  POINTER_MOVE,
  POINTER_UP,
} from '../kernel/protocol.ts';
import type { EffectRuntime } from '../kernel/runtime.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../kernel/session.ts';
import {
  createSortablePresentationOwner,
  type SortablePresentationOwner,
} from './effects/activation.ts';
import {
  createSortableLandingOwner,
  type SortableLandingOwner,
} from './effects/landing.ts';
import {
  createReorderResolutionOwner,
  type ReorderResolutionOwner,
} from './effects/resolution.ts';
import {
  ACQUIRE_SORTABLE_ACTIVATION,
  ACTIVATION_FAILED,
  ACTIVATION_READY,
  ACTIVE_INSERTION_FAILED,
  ACTIVE_INSERTION_RESOLVED,
  BEGIN_KEYBOARD_OPERATION,
  BEGIN_POINTER_OPERATION,
  DISARM_OPERATION,
  FAILURE_REPORTED,
  FINALIZATION_COMPLETED,
  FINALIZATION_FAILED,
  FINALIZE_OPERATION,
  INTERACTION_STOPPED,
  INVOKE_START,
  OPEN_REORDER_RESOLUTION,
  OPERATION_ARM_FAILED,
  OPERATION_ARMED,
  OPERATION_CANCELED,
  PIN_LANDING,
  PLACE_COMMITTED_INSERTION,
  POINTER_MOVED,
  POINTER_RELEASED,
  PREPARE_SORTABLE_LANDING,
  PRESENT_MOTION,
  PRESENTATION_SETTLED,
  PROPOSAL_INSERTION_FAILED,
  PROPOSAL_INSERTION_RESOLVED,
  REPORT_FAILURE,
  RESOLVE_ACTIVE_INSERTION,
  RESOLVE_PROPOSAL_INSERTION,
  RETIRE_OPERATION,
  START_FAILED,
  START_LANDING,
  START_SUCCEEDED,
  STOP_INTERACTION,
  WATCH_PRESENTATION,
  type SortableEffect,
  type SortableEffectDeps,
  type SortableEvent,
  type SpatialRequest,
} from './machine.ts';
import type { SortableCancelResult, SortableFinishResult } from './options.ts';

function assertNever(value: never): never {
  throw new Error(
    `drag: unknown sortable effect ${(value as { type?: unknown }).type as string}`,
  );
}

export function createSortableEffects(
  deps: SortableEffectDeps,
  dispatch: (event: SortableEvent) => void,
): EffectRuntime<SortableEffect> {
  let terminal = false;
  let operationId = 0;
  let pointerId = 0;
  let resources: OperationResources | null = null;
  let presentation: SortablePresentationOwner | null = null;
  let frame: FrameTask<SpatialRequest> | null = null;
  let resolution: ReorderResolutionOwner | null = null;
  let landing: SortableLandingOwner | null = null;
  let stopPresentationWatch: (() => void) | null = null;

  const current = (currency: { operationId: number }): boolean =>
    !terminal && operationId !== 0 && currency.operationId === operationId;

  const stopMechanical = (): void => {
    resources?.stopInteraction();
    resolution?.abort();
    resolution = null;
    frame?.cancel();
    frame = null;
    stopPresentationWatch?.();
    stopPresentationWatch = null;
    landing?.destroy();
    landing = null;
  };

  const retire = (): void => {
    stopMechanical();
    resources?.releasePresentation();
    resources = null;
    presentation?.destroy();
    presentation = null;
    operationId = 0;
    pointerId = 0;
  };

  const resolveActive = (request: SpatialRequest): void => {
    if (!current(request) || !presentation) {
      return;
    }
    try {
      dispatch({
        type: ACTIVE_INSERTION_RESOLVED,
        operationId: request.operationId,
        collectionVersion: request.collectionVersion,
        spatialId: request.spatialId,
        insertion: presentation.resolve(request),
      });
    } catch (error) {
      dispatch({
        type: ACTIVE_INSERTION_FAILED,
        operationId: request.operationId,
        collectionVersion: request.collectionVersion,
        spatialId: request.spatialId,
        error,
      });
    }
  };

  const execute = (effect: SortableEffect): EffectDisposition => {
    if (terminal) {
      return STOP_BATCH;
    }

    switch (effect.type) {
      case BEGIN_POINTER_OPERATION:
      case BEGIN_KEYBOARD_OPERATION: {
        retire();
        ({ operationId } = effect);
        pointerId =
          effect.type === BEGIN_POINTER_OPERATION ? effect.pointerId : 0;
        resources = createOperationResources((error) => {
          reportError_(error, undefined);
        });
        presentation = createSortablePresentationOwner(deps);
        landing = createSortableLandingOwner(
          deps.realm,
          presentation,
          dispatch,
        );
        frame = createFrameTask(deps.realm, resolveActive);

        if (effect.type === BEGIN_POINTER_OPERATION) {
          try {
            deps.pointerSource.armSession(resources.signal, (raw) => {
              if (!current(effect)) {
                return;
              }
              if (raw.type === CANCEL_ESCAPE) {
                dispatch({
                  type: OPERATION_CANCELED,
                  reason: { type: CANCEL_ESCAPE },
                });
                return;
              }
              const point = { x: raw.clientX, y: raw.clientY };
              if (raw.type === POINTER_MOVE) {
                dispatch({
                  type: POINTER_MOVED,
                  operationId,
                  pointerId: raw.pointerId,
                  point,
                });
              } else if (raw.type === POINTER_UP) {
                dispatch({
                  type: POINTER_RELEASED,
                  operationId,
                  pointerId: raw.pointerId,
                  point,
                });
              } else if (
                raw.type === POINTER_CANCEL &&
                raw.pointerId === pointerId
              ) {
                dispatch({
                  type: OPERATION_CANCELED,
                  reason: { type: CANCEL_POINTER },
                });
              }
            });
          } catch (error) {
            dispatch({ type: OPERATION_ARM_FAILED, operationId, error });
            return CONTINUE_BATCH;
          }
        }
        dispatch({ type: OPERATION_ARMED, operationId });
        return CONTINUE_BATCH;
      }

      case DISARM_OPERATION:
        if (current(effect)) {
          retire();
        }
        return CONTINUE_BATCH;

      case ACQUIRE_SORTABLE_ACTIVATION:
        if (!current(effect) || !resources || !presentation) {
          return CONTINUE_BATCH;
        }
        try {
          dispatch({
            type: ACTIVATION_READY,
            operationId,
            ...presentation.acquire(effect.operation, resources),
          });
        } catch (error) {
          dispatch({ type: ACTIVATION_FAILED, operationId, error });
        }
        return CONTINUE_BATCH;

      case INVOKE_START:
        if (!current(effect)) {
          return CONTINUE_BATCH;
        }
        try {
          effect.callback?.(effect.item);
          dispatch({ type: START_SUCCEEDED, operationId });
        } catch (error) {
          dispatch({ type: START_FAILED, operationId, error });
        }
        return CONTINUE_BATCH;

      case PRESENT_MOTION:
        if (current(effect)) {
          try {
            presentation?.render(effect.origin, effect.point);
          } catch (error) {
            dispatch({
              type: ACTIVE_INSERTION_FAILED,
              operationId,
              collectionVersion: -1,
              spatialId: -1,
              error,
            });
          }
        }
        return CONTINUE_BATCH;

      case RESOLVE_ACTIVE_INSERTION:
        if (current(effect.request)) {
          frame?.schedule(effect.request);
        }
        return CONTINUE_BATCH;

      case PLACE_COMMITTED_INSERTION:
        if (current(effect)) {
          try {
            presentation?.place(effect.insertion);
          } catch (error) {
            reportError_(error, undefined);
          }
        }
        return CONTINUE_BATCH;

      case RESOLVE_PROPOSAL_INSERTION:
        if (!current(effect.request) || !presentation) {
          return CONTINUE_BATCH;
        }
        frame?.cancel();
        try {
          dispatch({
            type: PROPOSAL_INSERTION_RESOLVED,
            operationId: effect.request.operationId,
            collectionVersion: effect.request.collectionVersion,
            spatialId: effect.request.spatialId,
            insertion: presentation.resolve(effect.request),
          });
        } catch (error) {
          dispatch({
            type: PROPOSAL_INSERTION_FAILED,
            operationId: effect.request.operationId,
            collectionVersion: effect.request.collectionVersion,
            spatialId: effect.request.spatialId,
            error,
          });
        }
        return CONTINUE_BATCH;

      case OPEN_REORDER_RESOLUTION: {
        if (!current(effect) || !resources) {
          return CONTINUE_BATCH;
        }
        resolution?.abort();
        resolution = createReorderResolutionOwner(
          {
            operationId: effect.operationId,
            resolutionId: effect.resolutionId,
          },
          dispatch,
        );
        const ownedResolution = resolution;
        resources.interaction.useWhile(
          () => !ownedResolution.completed(),
          () => ownedResolution.abort(),
        );
        resolution.invoke(effect.proposal.request, effect.callback);
        return CONTINUE_BATCH;
      }
      case STOP_INTERACTION:
        if (current(effect)) {
          resources?.stopInteraction();
          resolution = null;
          frame?.cancel();
          dispatch({ type: INTERACTION_STOPPED, operationId });
        }
        return CONTINUE_BATCH;

      case WATCH_PRESENTATION:
        if (current(effect)) {
          stopPresentationWatch?.();
          stopPresentationWatch = watchPresentationReady(
            effect.ready,
            {
              operationId: effect.operationId,
              resolutionId: effect.resolutionId,
            },
            deps.realm,
            (currency, error) => {
              dispatch({
                type: PRESENTATION_SETTLED,
                ...currency,
                ...(error === null ? {} : { error }),
              });
            },
          );
        }
        return CONTINUE_BATCH;

      case PREPARE_SORTABLE_LANDING:
        if (!current(effect) || !landing) {
          return CONTINUE_BATCH;
        }
        landing.prepare(effect, effect.operation, effect.recovery);
        return CONTINUE_BATCH;

      case START_LANDING:
        if (!current(effect)) {
          return CONTINUE_BATCH;
        }
        landing?.start(effect, effect.plan, effect.timing);
        return CONTINUE_BATCH;

      case PIN_LANDING:
        if (!current(effect)) {
          return CONTINUE_BATCH;
        }
        landing?.pin(effect);
        return CONTINUE_BATCH;

      case REPORT_FAILURE:
        if (current(effect)) {
          reportError_(
            effect.error,
            effect.callback
              ? (error) =>
                  effect.callback?.(error, {
                    cause: effect.cause,
                    domain: effect.domain,
                  })
              : undefined,
          );
          dispatch({ type: FAILURE_REPORTED, operationId });
        }
        return CONTINUE_BATCH;

      case FINALIZE_OPERATION:
        if (!current(effect)) {
          return CONTINUE_BATCH;
        }
        stopMechanical();
        resources?.releasePresentation();
        presentation?.destroy();
        presentation = null;
        try {
          const { terminal: outcome } = effect;
          if (
            (outcome.result === OUTCOME_ACCEPTED ||
              outcome.result === OUTCOME_NO_OP) &&
            outcome.domain
          ) {
            effect.onFinish?.(outcome.domain as SortableFinishResult);
          } else if (
            (outcome.result === OUTCOME_REJECTED ||
              outcome.result === OUTCOME_CANCELED) &&
            outcome.domain
          ) {
            effect.onCancel?.(outcome.domain as SortableCancelResult);
          }
          dispatch({ type: FINALIZATION_COMPLETED, operationId });
        } catch (error) {
          dispatch({
            type: FINALIZATION_FAILED,
            operationId,
            cause: {
              stage:
                effect.terminal.result === OUTCOME_ACCEPTED ||
                effect.terminal.result === OUTCOME_NO_OP
                  ? FAILURE_FINISH_CALLBACK
                  : FAILURE_CANCEL_CALLBACK,
            },
            error,
          });
        }
        return CONTINUE_BATCH;

      case RETIRE_OPERATION:
        if (current(effect)) {
          retire();
        }
        return CONTINUE_BATCH;

      default:
        return assertNever(effect);
    }
  };

  return {
    execute,
    destroy() {
      if (!terminal) {
        terminal = true;
        retire();
      }
    },
  };
}
