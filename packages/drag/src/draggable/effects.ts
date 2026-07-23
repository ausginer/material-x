import {
  createLandingRunner,
  type LandingRunner,
} from '../kernel/animation.ts';
import { createMapper, IDENTITY_MAPPER } from '../kernel/coordinate.ts';
import { reportError_ } from '../kernel/errors.ts';
import { createOperationResources } from '../kernel/operation-resources.ts';
import { acquirePointerCapture } from '../kernel/pointer.ts';
import { watchPresentationReady } from '../kernel/presentation-ready.ts';
import {
  acquireLift,
  createDragRenderer,
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type DragRenderer,
  type LiftMode as PresentationLiftMode,
  type VisualLiftSession,
} from '../kernel/presentation.ts';
import {
  CANCEL_ESCAPE,
  CANCEL_POINTER,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
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
import { resolveBounds } from './bounds.ts';
import { homeLandingPlan, isValidHomeTarget } from './landing.ts';
import {
  ACQUIRE_FREE_ACTIVATION,
  ACTIVATION_FAILED,
  ACTIVATION_READY,
  BEGIN_POINTER_OPERATION,
  CONTROLLED_POSITION_FAILED,
  CONTROLLED_POSITION_RESOLVED,
  DISARM_OPERATION,
  DROP_RESOLUTION_FAILED,
  DROP_RESOLVED,
  FAILURE_REPORTED,
  FINALIZATION_COMPLETED,
  FINALIZATION_FAILED,
  FINALIZE_OPERATION,
  INTERACTION_STOPPED,
  INVALIDATED,
  INVOKE_MOVE,
  INVOKE_START,
  LANDING_FAILED,
  LANDING_FINISHED,
  LANDING_PIN_FAILED,
  LANDING_PINNED,
  LANDING_PLAN_FAILED,
  LANDING_PLAN_RESOLVED,
  LANDING_START_FAILED,
  LANDING_STARTED,
  MOTION_OBSERVATION_FAILED,
  MOTION_OBSERVED,
  MOTION_PRESENTATION_FAILED,
  MOVE_CALLBACK_FAILED,
  MOVE_CALLBACK_SUCCEEDED,
  OBSERVE_CONTROLLED_POSITION,
  OBSERVE_FREE_MOTION,
  OPEN_DROP_RESOLUTION,
  OPERATION_ARM_FAILED,
  OPERATION_ARMED,
  OPERATION_CANCELED,
  PIN_LANDING,
  POINTER_MOVED,
  POINTER_RELEASED,
  PREPARE_FREE_LANDING,
  PRESENT_MOTION,
  PRESENTATION_SETTLED,
  RELEASE_FAILED,
  RELEASE_RESOLVED,
  REPORT_FAILURE,
  RESOLVE_FREE_RELEASE,
  RETIRE_OPERATION,
  START_FAILED,
  START_LANDING,
  START_SUCCEEDED,
  STOP_INTERACTION,
  WATCH_PRESENTATION,
  type DraggableEffect,
  type DraggableEffectDeps,
  type DraggableEvent,
  type GeometryRequest,
  type ResolutionCurrency,
} from './machine.ts';
import { geometryOf, pointerDelta } from './motion.ts';
import {
  LIFT_FLATTEN,
  LIFT_NONE,
  LIFT_TOP_LAYER,
  type DraggableOptions,
  type FreeDropResolution,
} from './options.ts';
import { buildFreeDropProposal } from './request.ts';

const DEFAULT_TIMING = { duration: 200, easing: 'ease' } as const;

const LIFT_MODES: Readonly<
  Record<NonNullable<DraggableOptions['lift']>, PresentationLiftMode>
> = {
  [LIFT_TOP_LAYER]: LIFT_FAITHFUL,
  [LIFT_FLATTEN]: LIFT_FLAT,
  [LIFT_NONE]: LIFT_IN_PLACE,
};

type ResolutionOwner = Readonly<{
  currency: ResolutionCurrency;
  controller: AbortController;
  completed(): boolean;
  complete(): void;
}>;

function isResolution(value: unknown): value is FreeDropResolution {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { type } = value as { type?: unknown };
  return type === OUTCOME_ACCEPTED || type === OUTCOME_REJECTED;
}

function assertNever(value: never): never {
  throw new Error(
    `drag: unknown effect ${(value as { type?: unknown }).type as string}`,
  );
}

export function createDraggableEffects(
  deps: DraggableEffectDeps,
  dispatch: (event: DraggableEvent) => void,
): EffectRuntime<DraggableEffect> {
  let terminal = false;
  let operationId = 0;
  let pointerId = 0;
  let resources: ReturnType<typeof createOperationResources> | null = null;
  let lift: VisualLiftSession | null = null;
  let renderer: DragRenderer | null = null;
  let resolution: ResolutionOwner | null = null;
  let presentationWatch: (() => void) | null = null;
  let landing: LandingRunner | null = null;
  let boundsVersion = -1;
  let boundsCached = false;
  let boundsCache: DOMRectReadOnly | null = null;

  const current = (currency: { operationId: number }): boolean =>
    !terminal && operationId !== 0 && operationId === currency.operationId;

  const resetBounds = (): void => {
    boundsVersion = -1;
    boundsCached = false;
    boundsCache = null;
  };

  const stopWatch = (): void => {
    presentationWatch?.();
    presentationWatch = null;
  };

  const stopLanding = (): void => {
    landing?.destroy();
    landing = null;
  };

  const cleanupMechanical = (): void => {
    resources?.stopInteraction();
    resolution = null;
    stopWatch();
    stopLanding();
    resources?.releasePresentation();
    resources = null;
    lift = null;
    renderer = null;
    resetBounds();
  };

  const retire = (currency?: { operationId: number }): void => {
    if (currency && !current(currency)) {
      return;
    }

    cleanupMechanical();
    operationId = 0;
    pointerId = 0;
  };

  const readBounds = (
    source: DraggableOptions['bounds'],
    version: number,
    refresh: boolean,
  ): DOMRectReadOnly | null => {
    if (typeof source === 'function') {
      return resolveBounds(source, deps.realm);
    }

    if (refresh || version !== boundsVersion) {
      boundsVersion = version;
      boundsCached = false;
    }

    if (!boundsCached) {
      boundsCache = resolveBounds(source, deps.realm);
      boundsCached = true;
    }

    return boundsCache;
  };

  const geometry = (request: GeometryRequest) =>
    geometryOf(
      request.pointer,
      request.originPointer,
      request.viewportDelta,
      request.originRect,
      request.coordinateSpace,
      deps.realm,
    );

  const execute = (effect: DraggableEffect): EffectDisposition => {
    if (terminal) {
      return STOP_BATCH;
    }

    switch (effect.type) {
      case BEGIN_POINTER_OPERATION: {
        retire();
        ({ operationId, pointerId } = effect);
        resources = createOperationResources((error) => {
          reportError_(error, undefined);
        });

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
                pointerId: raw.pointerId,
                point,
              });
            } else if (raw.type === POINTER_UP) {
              dispatch({
                type: POINTER_RELEASED,
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
          dispatch({ type: OPERATION_ARMED, operationId: effect.operationId });
          return CONTINUE_BATCH;
        } catch (error) {
          cleanupMechanical();
          dispatch({
            type: OPERATION_ARM_FAILED,
            operationId: effect.operationId,
            error,
          });
          return STOP_BATCH;
        }
      }

      case DISARM_OPERATION:
      case RETIRE_OPERATION:
        retire(effect);
        return CONTINUE_BATCH;

      case ACQUIRE_FREE_ACTIVATION: {
        if (!current(effect) || !resources) {
          return STOP_BATCH;
        }

        try {
          const originRect = deps.visual.getBoundingClientRect();
          const context = deps.item.offsetParent;
          const coordinateSpace =
            effect.coordinateSpace ??
            createMapper(
              context instanceof deps.realm.window.HTMLElement
                ? context
                : deps.realm.document.documentElement,
              deps.realm,
            ) ??
            IDENTITY_MAPPER;
          const mode = LIFT_MODES[deps.lift ?? LIFT_TOP_LAYER];
          lift = acquireLift(
            deps.visual,
            mode,
            originRect,
            (delta) => coordinateSpace.deltaFromViewport(delta),
            deps.realm,
          );
          resources.presentation.use(() => lift?.dispose());
          renderer = createDragRenderer(lift);
          resources.interaction.use(
            acquirePointerCapture(deps.item, effect.pointerId),
          );
          deps.invalidation.arm(resources.signal, () => {
            if (current(effect)) {
              dispatch({ type: INVALIDATED });
            }
          });
          dispatch({
            type: ACTIVATION_READY,
            operationId: effect.operationId,
            candidate: { originRect, coordinateSpace },
          });
          return CONTINUE_BATCH;
        } catch (error) {
          cleanupMechanical();
          dispatch({
            type: ACTIVATION_FAILED,
            operationId: effect.operationId,
            error,
          });
          return STOP_BATCH;
        }
      }

      case INVOKE_START: {
        if (!current(effect)) {
          return STOP_BATCH;
        }

        try {
          effect.callback?.(geometry(effect.geometry));

          if (current(effect)) {
            dispatch({
              type: START_SUCCEEDED,
              operationId: effect.operationId,
            });
          }
          return CONTINUE_BATCH;
        } catch (error) {
          if (current(effect)) {
            dispatch({
              type: START_FAILED,
              operationId: effect.operationId,
              error,
            });
          }
          return STOP_BATCH;
        }
      }

      case OBSERVE_FREE_MOTION: {
        if (!current(effect)) {
          return STOP_BATCH;
        }

        try {
          dispatch({
            type: MOTION_OBSERVED,
            operationId: effect.operationId,
            motionId: effect.motionId,
            bounds: readBounds(
              effect.bounds,
              effect.boundsVersion,
              effect.refresh,
            ),
          });
          return CONTINUE_BATCH;
        } catch (error) {
          dispatch({
            type: MOTION_OBSERVATION_FAILED,
            operationId: effect.operationId,
            motionId: effect.motionId,
            error,
          });
          return STOP_BATCH;
        }
      }

      case OBSERVE_CONTROLLED_POSITION: {
        if (!current(effect)) {
          return STOP_BATCH;
        }

        try {
          const viewport = effect.coordinateSpace.toViewport(effect.position);
          dispatch({
            type: CONTROLLED_POSITION_RESOLVED,
            operationId: effect.operationId,
            motionId: effect.motionId,
            viewportDelta: {
              x: viewport.x - effect.originRect.left,
              y: viewport.y - effect.originRect.top,
            },
          });
          return CONTINUE_BATCH;
        } catch (error) {
          dispatch({
            type: CONTROLLED_POSITION_FAILED,
            operationId: effect.operationId,
            motionId: effect.motionId,
            error,
          });
          return STOP_BATCH;
        }
      }

      case RESOLVE_FREE_RELEASE: {
        if (!current(effect)) {
          return STOP_BATCH;
        }

        try {
          const bounds = readBounds(effect.bounds, effect.boundsVersion, false);
          const viewportDelta = pointerDelta(
            effect.point,
            effect.originPointer,
            effect.originRect,
            effect.axis,
            bounds,
          );
          dispatch({
            type: RELEASE_RESOLVED,
            operationId: effect.operationId,
            motionId: effect.motionId,
            viewportDelta,
            proposal: buildFreeDropProposal(
              effect.item,
              effect.visual,
              effect.point,
              viewportDelta,
              effect.originRect,
              effect.coordinateSpace,
              deps.realm,
            ),
          });
          return CONTINUE_BATCH;
        } catch (error) {
          dispatch({
            type: RELEASE_FAILED,
            operationId: effect.operationId,
            motionId: effect.motionId,
            error,
          });
          return STOP_BATCH;
        }
      }

      case PRESENT_MOTION:
        if (!current(effect)) {
          return STOP_BATCH;
        }

        try {
          if (!renderer) {
            throw new Error('drag: renderer unavailable');
          }

          renderer.render(effect.viewportDelta);
          return CONTINUE_BATCH;
        } catch (error) {
          dispatch({
            type: MOTION_PRESENTATION_FAILED,
            operationId: effect.operationId,
            motionId: effect.motionId,
            error,
          });
          return STOP_BATCH;
        }

      case INVOKE_MOVE:
        if (!current(effect)) {
          return STOP_BATCH;
        }

        try {
          effect.callback(geometry(effect.geometry));

          if (current(effect)) {
            dispatch({
              type: MOVE_CALLBACK_SUCCEEDED,
              operationId: effect.operationId,
              motionId: effect.motionId,
            });
          }
          return CONTINUE_BATCH;
        } catch (error) {
          if (current(effect)) {
            dispatch({
              type: MOVE_CALLBACK_FAILED,
              operationId: effect.operationId,
              motionId: effect.motionId,
              error,
            });
          }
          return STOP_BATCH;
        }

      case OPEN_DROP_RESOLUTION: {
        if (!current(effect) || !resources) {
          return STOP_BATCH;
        }

        resolution?.controller.abort();
        const controller = new AbortController();
        let completed = false;
        const owner: ResolutionOwner = {
          currency: effect,
          controller,
          completed: () => completed,
          complete() {
            completed = true;
          },
        };
        resolution = owner;
        resources.interaction.useWhile(
          () => !owner.completed(),
          () => controller.abort(),
        );

        const finish = (event: DraggableEvent): void => {
          if (completed || controller.signal.aborted || !current(effect)) {
            return;
          }

          owner.complete();
          dispatch(event);
        };

        let value: ReturnType<typeof effect.callback>;

        try {
          value = effect.callback(effect.request, {
            signal: controller.signal,
          });
        } catch (error) {
          finish({
            type: DROP_RESOLUTION_FAILED,
            operationId: effect.operationId,
            resolutionId: effect.resolutionId,
            error,
          });
          return STOP_BATCH;
        }

        Promise.resolve(value).then(
          (result) => {
            finish(
              isResolution(result)
                ? {
                    type: DROP_RESOLVED,
                    operationId: effect.operationId,
                    resolutionId: effect.resolutionId,
                    resolution: result,
                  }
                : {
                    type: DROP_RESOLUTION_FAILED,
                    operationId: effect.operationId,
                    resolutionId: effect.resolutionId,
                    error: new Error(
                      'drag: onDrop returned an invalid resolution',
                    ),
                  },
            );
          },
          (error: unknown) => {
            finish({
              type: DROP_RESOLUTION_FAILED,
              operationId: effect.operationId,
              resolutionId: effect.resolutionId,
              error,
            });
          },
        );
        return CONTINUE_BATCH;
      }

      case STOP_INTERACTION:
        if (!current(effect)) {
          return STOP_BATCH;
        }

        resources?.stopInteraction();
        resolution = null;
        dispatch({
          type: INTERACTION_STOPPED,
          operationId: effect.operationId,
        });
        return CONTINUE_BATCH;

      case WATCH_PRESENTATION:
        if (!current(effect)) {
          return STOP_BATCH;
        }

        stopWatch();
        presentationWatch = watchPresentationReady(
          effect.ready,
          effect,
          deps.realm,
          (currency, error) => {
            if (current(currency)) {
              presentationWatch = null;
              dispatch({
                type: PRESENTATION_SETTLED,
                operationId: currency.operationId,
                resolutionId: currency.resolutionId,
                error,
              });
            }
          },
        );
        return CONTINUE_BATCH;

      case PREPARE_FREE_LANDING:
        if (!current(effect)) {
          return STOP_BATCH;
        }

        stopLanding();

        try {
          const target = effect.resolve({
            item: effect.item,
            visual: effect.visual,
          });

          if (!isValidHomeTarget(target)) {
            throw new Error('drag: invalid home target');
          }

          dispatch({
            type: LANDING_PLAN_RESOLVED,
            operationId: effect.operationId,
            landingId: effect.landingId,
            plan: homeLandingPlan(
              target,
              effect.viewportDelta,
              effect.originRect,
            ),
          });
          return CONTINUE_BATCH;
        } catch (error) {
          dispatch({
            type: LANDING_PLAN_FAILED,
            operationId: effect.operationId,
            landingId: effect.landingId,
            error,
          });
          return STOP_BATCH;
        }

      case START_LANDING: {
        if (!current(effect)) {
          return STOP_BATCH;
        }

        stopLanding();

        try {
          if (!lift) {
            throw new Error('drag: landing lift unavailable');
          }

          const timing = effect.timing?.() ?? DEFAULT_TIMING;
          landing = createLandingRunner(
            lift,
            effect.plan,
            effect,
            timing,
            deps.realm,
            (currency) => {
              if (current(currency)) {
                dispatch({
                  type: LANDING_FINISHED,
                  operationId: currency.operationId,
                  landingId: currency.landingId,
                });
              }
            },
            (currency, error) => {
              if (current(currency)) {
                dispatch({
                  type: LANDING_FAILED,
                  operationId: currency.operationId,
                  landingId: currency.landingId,
                  error,
                });
              }
            },
          );
          dispatch({
            type: LANDING_STARTED,
            operationId: effect.operationId,
            landingId: effect.landingId,
          });
          return CONTINUE_BATCH;
        } catch (error) {
          dispatch({
            type: LANDING_START_FAILED,
            operationId: effect.operationId,
            landingId: effect.landingId,
            error,
          });
          return STOP_BATCH;
        }
      }

      case PIN_LANDING:
        if (!current(effect)) {
          return STOP_BATCH;
        }

        try {
          if (!landing) {
            throw new Error('drag: landing runner unavailable');
          }

          landing.pin();
          dispatch({
            type: LANDING_PINNED,
            operationId: effect.operationId,
            landingId: effect.landingId,
          });
          return CONTINUE_BATCH;
        } catch (error) {
          dispatch({
            type: LANDING_PIN_FAILED,
            operationId: effect.operationId,
            landingId: effect.landingId,
            error,
          });
          return STOP_BATCH;
        }

      case REPORT_FAILURE: {
        if (!current(effect)) {
          return STOP_BATCH;
        }

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

        if (current(effect)) {
          dispatch({
            type: FAILURE_REPORTED,
            operationId: effect.operationId,
          });
        }
        return CONTINUE_BATCH;
      }

      case FINALIZE_OPERATION:
        if (!current(effect)) {
          return STOP_BATCH;
        }

        resources?.releasePresentation();
        lift = null;
        renderer = null;
        stopWatch();
        stopLanding();

        try {
          const { terminal: outcome } = effect;

          if (
            outcome.result === OUTCOME_ACCEPTED &&
            outcome.domain?.type === OUTCOME_ACCEPTED
          ) {
            effect.onFinish?.(outcome.domain);
          } else if (
            (outcome.result === OUTCOME_REJECTED ||
              outcome.result === OUTCOME_CANCELED) &&
            (outcome.domain?.type === OUTCOME_REJECTED ||
              outcome.domain?.type === OUTCOME_CANCELED)
          ) {
            effect.onCancel?.(outcome.domain);
          }

          if (current(effect)) {
            dispatch({
              type: FINALIZATION_COMPLETED,
              operationId: effect.operationId,
            });
          }
          return CONTINUE_BATCH;
        } catch (error) {
          if (current(effect)) {
            dispatch({
              type: FINALIZATION_FAILED,
              operationId: effect.operationId,
              error,
            });
          }
          return STOP_BATCH;
        }

      default:
        return assertNever(effect);
    }
  };

  return {
    execute,
    destroy() {
      if (terminal) {
        return;
      }

      terminal = true;
      retire();
    },
  };
}
