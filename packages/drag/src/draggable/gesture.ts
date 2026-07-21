/**
 * Interprets committed draggable transitions and owns their effect resources.
 * It reads every semantic value from `(from, to, event)` and retains only
 * mechanical references: the gesture scope, lift session, renderer, capture
 * lease, current resolution effect, and current landing runner.
 */
import {
  createLandingRunner,
  type LandingRunner,
} from '../kernel/animation.ts';
import { createMapper, IDENTITY_MAPPER } from '../kernel/coordinate.ts';
import { reportError_ } from '../kernel/errors.ts';
import {
  createGestureScope,
  type GestureScope,
} from '../kernel/gesture-scope.ts';
import type { InvalidationSource } from '../kernel/invalidation.ts';
import type { OperationIdentitySource } from '../kernel/operation-id.ts';
import { acquirePointerCapture } from '../kernel/pointer.ts';
import { watchPresentationReady } from '../kernel/presentation-ready.ts';
import {
  createDragRenderer,
  acquireLift,
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type DragRenderer,
  type LiftMode,
  type VisualLiftSession,
} from '../kernel/presentation.ts';
import {
  FAILURE_ACTIVATION,
  FAILURE_CANCEL_CALLBACK,
  FAILURE_FINISH_CALLBACK,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_MOVE,
  type LandingCurrency,
  type LandingPlan,
  type FailureCause,
  isLandingSettled,
  LANDING_COMPLETING,
  LANDING_PREPARING,
  LANDING_RUNNING,
  LANDING_SKIPPED,
  LIFECYCLE_ACTIVATION_FAILED,
  LIFECYCLE_ACTIVATION_READY,
  LIFECYCLE_START_SUCCEEDED,
  OPERATION_ADMITTED,
  OPERATION_CANDIDATE,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  OUTCOME_REJECTED,
  PHASE_ACTIVATING,
  PHASE_AWAITING_RESULT,
  PHASE_DRAGGING,
  PHASE_IDLE,
  PHASE_PENDING,
  PHASE_SETTLING,
  RECOVERY_HOME,
} from '../kernel/protocol.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type { Disposer } from '../kernel/resource-scope.ts';
import {
  type AnimationTiming,
  type CoordinateMapper,
  type DragGeometry,
  type DragSubject,
  ORIGIN,
} from '../kernel/types.ts';
import { homeLandingPlan, isValidHomeTarget } from './landing.ts';
import { geometryOf } from './motion.ts';
import {
  LIFT_FLATTEN,
  LIFT_NONE,
  LIFT_TOP_LAYER,
  type AcceptedFreeDropResult,
  type DraggableOptions,
  type FreeDropResult,
  type FreeHomeTarget,
} from './options.ts';
import {
  DROP_AWAITING_CONSUMER,
  DROP_PROPOSAL_READY,
  EFFECT_FAILED,
  DROP_RESOLVED,
  HOME_INVALID,
  PRESENTATION_SETTLED,
  INVALIDATE,
  LANDING_FINISHED,
  LANDING_PINNED,
  LANDING_PLAN_READY,
  LANDING_STARTED,
  RESOLUTION_STARTED,
  SETTLEMENT_COMPLETED,
  SETTLEMENT_FAILED,
  type DraggableEvent,
  type DraggableState,
  type FreeOperation,
} from './reducer.ts';
import {
  createDropResolution,
  type DropResolutionEffect,
} from './resolution.ts';

const DEFAULT_TIMING: AnimationTiming = { duration: 200, easing: 'ease' };

const LIFT_MODES: Readonly<
  Record<NonNullable<DraggableOptions['lift']>, LiftMode>
> = {
  [LIFT_TOP_LAYER]: LIFT_FAITHFUL,
  [LIFT_FLATTEN]: LIFT_FLAT,
  [LIFT_NONE]: LIFT_IN_PLACE,
};

export type FreeGestureDeps = DragSubject &
  Readonly<{
    realm: DOMRealm;
    ids: OperationIdentitySource;
    options: DraggableOptions;
    invalidation: InvalidationSource;
    dispatch(event: DraggableEvent): void;
    /** Resolves the live bounds rect for a pointer move (effectful). */
    currentBounds(): DOMRectReadOnly | null;
  }>;

/** The reported geometry for an active/candidate draggable state. */
function freeGeometry(to: DraggableState, realm: DOMRealm): DragGeometry {
  const op = to.operation;
  const { pointer } = to;

  if (!op || op.type === OPERATION_ADMITTED || !pointer) {
    throw new Error('drag: geometry requested without an active operation');
  }

  const mapper: CoordinateMapper =
    to.policy.coordinateOverride ?? op.coordinateSpace;
  return geometryOf(
    pointer.latest,
    pointer.origin,
    to.motion?.viewportDelta ?? ORIGIN,
    op.originRect,
    mapper,
    realm,
  );
}

export class FreeDragGesture {
  readonly #deps: FreeGestureDeps;
  readonly #scope: GestureScope;
  #lift: VisualLiftSession | null = null;
  #renderer: DragRenderer | null = null;
  #resolution: DropResolutionEffect | null = null;
  #landing: LandingRunner | null = null;
  #presentationWatchDisposer: Disposer | null = null;

  constructor(deps: FreeGestureDeps) {
    this.#deps = deps;
    this.#scope = createGestureScope((error) => this.#report(error, null));
  }

  get scope(): GestureScope {
    return this.#scope;
  }

  #report(error: unknown, domain: FreeDropResult | null): void {
    const { onError } = this.#deps.options;
    reportError_(
      error,
      onError
        ? (e) => onError(e, { cause: { stage: FAILURE_ACTIVATION }, domain })
        : undefined,
    );
  }

  #reportCause(
    error: unknown,
    cause: FailureCause,
    domain: FreeDropResult | null,
  ): void {
    const { onError } = this.#deps.options;
    reportError_(
      error,
      onError ? (e) => onError(e, { cause, domain }) : undefined,
    );
  }

  handle(
    from: DraggableState,
    to: DraggableState,
    event: DraggableEvent,
  ): void {
    // pending -> activating: transactional activation acquisition.
    if (from.phase === PHASE_PENDING && to.phase === PHASE_ACTIVATING) {
      this.#acquire(to);
      return;
    }

    // activating(admitted) -> activating(candidate): run onStart, then succeed.
    if (
      from.operation?.type === OPERATION_ADMITTED &&
      to.operation?.type === OPERATION_CANDIDATE
    ) {
      this.#start(to);
      return;
    }

    // activating(candidate) -> dragging(active): begin active rendering.
    if (from.phase === PHASE_ACTIVATING && to.phase === PHASE_DRAGGING) {
      this.#render(to);
      return;
    }

    // dragging -> dragging: render committed motion.
    if (
      from.phase === PHASE_DRAGGING &&
      to.phase === PHASE_DRAGGING &&
      to.motion !== from.motion
    ) {
      this.#render(to);
      this.#move(to);
      return;
    }

    // dragging -> awaiting-result: proposal-ready; render release, start resolution.
    if (from.phase === PHASE_DRAGGING && to.phase === PHASE_AWAITING_RESULT) {
      this.#render(to);
      this.#startResolution(to);
      return;
    }

    // proposal-ready -> awaiting-consumer: invoke onDrop.
    if (
      from.drop.stage === DROP_PROPOSAL_READY &&
      to.drop.stage === DROP_AWAITING_CONSUMER
    ) {
      this.#invokeResolution(to);
      return;
    }

    // Settlement.
    if (to.phase === PHASE_SETTLING) {
      this.#settle(from, to, event);
      return;
    }

    // settling -> idle: dispose presentation, run completion callbacks.
    if (from.phase === PHASE_SETTLING && to.phase === PHASE_IDLE) {
      this.#complete(from);
      return;
    }

    // pending -> idle: the press never activated, so there is no outcome to
    // report — but the armed document listeners must still go, or every click
    // on a draggable leaks one session's worth of them.
    if (from.phase === PHASE_PENDING && to.phase === PHASE_IDLE) {
      this.#scope.disarm();
      this.#scope.finish();
    }
  }

  /** Terminal, out-of-band teardown for controller destroy. */
  destroy(): void {
    this.#scope.settle();
    this.#landing?.destroy();
    this.#landing = null;
    this.#scope.finish();
  }

  // --- effect steps --------------------------------------------------------

  #acquire(to: DraggableState): void {
    const op = to.operation;

    if (op?.type !== OPERATION_ADMITTED || !to.pointer) {
      return;
    }

    const { realm, options, item, visual, invalidation, dispatch } = this.#deps;
    const { operationId } = op;

    try {
      const originRect = visual.getBoundingClientRect();
      const context = item.offsetParent;
      const derived =
        options.coordinateSpace ??
        createMapper(
          context instanceof realm.window.HTMLElement
            ? context
            : realm.document.documentElement,
          realm,
        ) ??
        IDENTITY_MAPPER;

      const mode = LIFT_MODES[options.lift ?? LIFT_TOP_LAYER];
      const lift = acquireLift(
        visual,
        mode,
        originRect,
        (d) => derived.deltaFromViewport(d),
        realm,
      );
      this.#scope.presentation.use(() => lift.dispose());
      this.#lift = lift;
      this.#renderer = createDragRenderer(lift);

      const capture = acquirePointerCapture(item, to.pointer.id);
      this.#scope.interaction.use(capture);

      invalidation.arm(this.#scope.signal, () => {
        dispatch({
          type: INVALIDATE,
          point: ORIGIN,
          bounds: this.#deps.currentBounds(),
        });
      });

      dispatch({
        type: LIFECYCLE_ACTIVATION_READY,
        operationId,
        candidate: { visual, lift: mode, originRect, coordinateSpace: derived },
      });
    } catch (error) {
      this.#reportCause(error, { stage: FAILURE_ACTIVATION }, null);
      this.#scope.settle();
      this.#scope.finish();
      dispatch({ type: LIFECYCLE_ACTIVATION_FAILED, operationId });
    }
  }

  #start(to: DraggableState): void {
    const { options, dispatch } = this.#deps;
    const op = to.operation;

    if (!op || op.type === OPERATION_ADMITTED) {
      return;
    }

    try {
      options.onStart?.(freeGeometry(to, this.#deps.realm));
      dispatch({
        type: LIFECYCLE_START_SUCCEEDED,
        operationId: op.operationId,
      });
    } catch (error) {
      this.#reportCause(error, { stage: FAILURE_ACTIVATION }, null);
      this.#scope.settle();
      this.#scope.finish();
      dispatch({
        type: LIFECYCLE_ACTIVATION_FAILED,
        operationId: op.operationId,
      });
    }
  }

  #render(to: DraggableState): void {
    this.#renderer?.render(to.motion?.viewportDelta ?? ORIGIN);
  }

  #move(to: DraggableState): void {
    const { options } = this.#deps;

    if (!options.onMove) {
      return;
    }

    try {
      options.onMove(freeGeometry(to, this.#deps.realm));
    } catch (error) {
      const op = to.operation;
      this.#reportCause(error, { stage: FAILURE_MOVE }, null);
      this.#deps.dispatch({
        type: EFFECT_FAILED,
        operationId: op?.operationId ?? 0,
        stage: FAILURE_MOVE,
        recovery: RECOVERY_HOME,
        error,
      });
    }
  }

  #startResolution(to: DraggableState): void {
    const op = to.operation;

    if (!op || op.type === OPERATION_ADMITTED) {
      return;
    }

    const resolutionId = this.#deps.ids.next();
    const resolution = createDropResolution(
      { operationId: op.operationId, resolutionId },
      this.#deps.dispatch,
    );
    this.#resolution = resolution;
    this.#scope.interaction.useWhile(
      () => !resolution.completed(),
      () => resolution.abort(),
    );
    this.#deps.dispatch({
      type: RESOLUTION_STARTED,
      operationId: op.operationId,
      resolutionId,
    });
  }

  #invokeResolution(to: DraggableState): void {
    if (to.drop.stage !== DROP_AWAITING_CONSUMER || !this.#resolution) {
      return;
    }

    this.#resolution.invoke(
      to.drop.proposal.request,
      this.#deps.options.onDrop,
    );
  }

  #settle(
    from: DraggableState,
    to: DraggableState,
    event: DraggableEvent,
  ): void {
    const { settlement } = to;

    if (!settlement) {
      return;
    }

    const operationId = to.operation?.operationId ?? 0;

    // Newly failed: report through onError before recovery.
    if (
      settlement.outcome.result === OUTCOME_FAILED &&
      from.settlement?.outcome.result !== OUTCOME_FAILED
    ) {
      const error =
        'error' in event ? (event as { error: unknown }).error : undefined;
      this.#reportCause(error, settlement.outcome.failure, settlement.domain);
    }

    // First entry into settling: abort interaction, prepare recovery.
    if (from.phase !== PHASE_SETTLING) {
      this.#scope.settle();
      this.#watchPresentation(event);

      if (settlement.landing.stage === LANDING_SKIPPED) {
        this.#deps.dispatch({ type: SETTLEMENT_COMPLETED, operationId });
        return;
      }

      this.#resolveHome(to);
      return;
    }

    const { landing } = settlement;

    // The authored-presentation barrier settled. On success with landing still
    // running there is nothing to do — landing drives completion. Otherwise
    // this is the last barrier, and a failed acknowledgement has replaced the
    // settlement with a fresh home recovery that nothing else would run.
    if (event.type === PRESENTATION_SETTLED) {
      if (landing.stage === LANDING_PREPARING && !landing.plan) {
        this.#resolveHome(to);
      } else if (isLandingSettled(landing)) {
        this.#deps.dispatch({ type: SETTLEMENT_COMPLETED, operationId });
      }
      return;
    }

    // preparing + plan committed: create the runner.
    if (
      landing.stage === LANDING_PREPARING &&
      landing.plan &&
      from.settlement?.landing.stage === LANDING_PREPARING
    ) {
      this.#startLanding(landing.currency, landing.plan);
      return;
    }

    // running -> completing: pin then finish landing.
    if (
      landing.stage === LANDING_COMPLETING &&
      from.settlement?.landing.stage === LANDING_RUNNING
    ) {
      this.#landing?.pin();
      this.#deps.dispatch({
        type: LANDING_PINNED,
        operationId,
        landingId: landing.currency.landingId,
      });
      return;
    }

    // Refined to skipped (settlement/home failure): complete deterministically.
    if (
      landing.stage === LANDING_SKIPPED &&
      from.settlement?.landing.stage !== LANDING_SKIPPED
    ) {
      this.#deps.dispatch({ type: SETTLEMENT_COMPLETED, operationId });
    }
  }

  #resolveHome(to: DraggableState): void {
    const { settlement } = to;
    const op = to.operation;

    if (
      settlement?.landing.stage !== LANDING_PREPARING ||
      !op ||
      op.type === OPERATION_ADMITTED
    ) {
      return;
    }

    const { currency } = settlement.landing;
    const { options } = this.#deps;

    if (!options.resolveHomeTarget) {
      this.#deps.dispatch({
        type: HOME_INVALID,
        operationId: currency.operationId,
        landingId: currency.landingId,
        error: new Error('drag: no home target'),
      });
      return;
    }

    let target: FreeHomeTarget;

    try {
      target = options.resolveHomeTarget({ item: op.item, visual: op.visual });
    } catch (error) {
      this.#deps.dispatch({
        type: HOME_INVALID,
        operationId: currency.operationId,
        landingId: currency.landingId,
        error,
      });
      return;
    }

    if (!isValidHomeTarget(target)) {
      this.#deps.dispatch({
        type: HOME_INVALID,
        operationId: currency.operationId,
        landingId: currency.landingId,
        error: new Error('drag: invalid home target'),
      });
      return;
    }

    const plan = homeLandingPlan(
      target,
      to.motion?.viewportDelta ?? ORIGIN,
      op.originRect,
    );
    this.#deps.dispatch({
      type: LANDING_PLAN_READY,
      operationId: currency.operationId,
      landingId: currency.landingId,
      plan,
    });
  }

  #startLanding(currency: LandingCurrency, plan: LandingPlan): void {
    if (!this.#lift) {
      return;
    }

    const timing = this.#deps.options.landingTiming?.() ?? DEFAULT_TIMING;

    this.#landing = createLandingRunner(
      this.#lift,
      plan,
      currency,
      timing,
      this.#deps.realm,
      (c) =>
        this.#deps.dispatch({
          type: LANDING_FINISHED,
          operationId: c.operationId,
          landingId: c.landingId,
        }),
      (c, error) =>
        this.#deps.dispatch({
          type: SETTLEMENT_FAILED,
          operationId: c.operationId,
          landingId: c.landingId,
          stage: FAILURE_LANDING_INTERRUPTED,
          error,
        }),
    );
    this.#deps.dispatch({
      type: LANDING_STARTED,
      operationId: currency.operationId,
      landingId: currency.landingId,
    });
  }

  /**
   * Arms the authored-presentation barrier when the consumer's resolution
   * carried one. The promise stays out of reducer state — only its settlement
   * is dispatched back, tagged with the resolution currency.
   */
  #watchPresentation(event: DraggableEvent): void {
    if (event.type !== DROP_RESOLVED || !event.resolution.presentationReady) {
      return;
    }

    this.#presentationWatchDisposer = watchPresentationReady(
      event.resolution.presentationReady,
      { operationId: event.operationId, resolutionId: event.resolutionId },
      this.#deps.realm,
      (currency, error) => {
        this.#deps.dispatch({
          type: PRESENTATION_SETTLED,
          operationId: currency.operationId,
          resolutionId: currency.resolutionId,
          error,
        });
      },
    );
  }

  #complete(from: DraggableState): void {
    const { settlement } = from;
    this.#scope.finish();
    this.#presentationWatchDisposer?.();
    this.#presentationWatchDisposer = null;
    this.#landing = null;
    this.#resolution = null;

    if (!settlement) {
      return;
    }

    const { options } = this.#deps;
    const { outcome } = settlement;

    if (
      outcome.result === OUTCOME_ACCEPTED &&
      settlement.domain?.type === OUTCOME_ACCEPTED
    ) {
      this.#guardCallback(
        () => options.onFinish?.(settlement.domain as AcceptedFreeDropResult),
        FAILURE_FINISH_CALLBACK,
        settlement.domain,
      );
      return;
    }

    if (
      outcome.result === OUTCOME_REJECTED &&
      settlement.domain?.type === OUTCOME_REJECTED
    ) {
      this.#guardCallback(
        () => options.onCancel?.(settlement.domain as never),
        FAILURE_CANCEL_CALLBACK,
        settlement.domain,
      );
      return;
    }

    if (outcome.result === OUTCOME_CANCELED) {
      this.#guardCallback(
        () =>
          options.onCancel?.({
            type: OUTCOME_CANCELED,
            reason: outcome.reason,
            proposal: null,
          }),
        FAILURE_CANCEL_CALLBACK,
        null,
      );
    }
    // failed: already reported through onError; no normal callback.
  }

  #guardCallback(
    fn: () => void,
    cause: FailureCause['stage'],
    domain: FreeDropResult | null,
  ): void {
    try {
      fn();
    } catch (error) {
      this.#reportCause(error, { stage: cause }, domain);
    }
  }
}

// Referenced only for the FreeOperation type import stability.
export type { FreeOperation };
