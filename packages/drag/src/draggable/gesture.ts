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
import {
  createDragRenderer,
  acquireLift,
  type DragRenderer,
  type LiftMode,
  type VisualLiftSession,
} from '../kernel/presentation.ts';
import type { FailureCause } from '../kernel/protocol.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import {
  ORIGIN,
  type AnimationTiming,
  type CoordinateMapper,
  type DragGeometry,
  type Point,
} from '../kernel/types.ts';
import { homeLandingPlan, isValidHomeTarget } from './landing.ts';
import { geometryOf } from './motion.ts';
import type {
  DraggableOptions,
  FreeDropResult,
  FreeHomeTarget,
} from './options.ts';
import type {
  DraggableEvent,
  DraggableState,
  FreeOperation,
} from './reducer.ts';
import {
  createDropResolution,
  type DropResolutionEffect,
} from './resolution.ts';

const DEFAULT_TIMING: AnimationTiming = { duration: 200, easing: 'ease' };

const LIFT_MODES: Readonly<
  Record<NonNullable<DraggableOptions['lift']>, LiftMode>
> = {
  'top-layer': 'faithful',
  flatten: 'flat',
  none: 'in-place',
};

export type FreeGestureDeps = Readonly<{
  realm: DOMRealm;
  ids: OperationIdentitySource;
  options: DraggableOptions;
  item: HTMLElement;
  visual: HTMLElement;
  invalidation: InvalidationSource;
  dispatch(event: DraggableEvent): void;
  /** Resolves the live bounds rect for a pointer move (effectful). */
  currentBounds(): DOMRectReadOnly | null;
}>;

/** The reported geometry for an active/candidate draggable state. */
function freeGeometry(to: DraggableState): DragGeometry {
  const op = to.operation;
  const { pointer } = to;

  if (!op || op.type === 'admitted' || !pointer) {
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
  );
}

export class FreeDragGesture {
  readonly #deps: FreeGestureDeps;
  readonly #scope: GestureScope;
  #lift: VisualLiftSession | null = null;
  #renderer: DragRenderer | null = null;
  #resolution: DropResolutionEffect | null = null;
  #landing: LandingRunner | null = null;

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
        ? (e) => onError(e, { cause: { stage: 'activation' }, domain })
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
    if (from.phase === 'pending' && to.phase === 'activating') {
      this.#acquire(to);
      return;
    }

    // activating(admitted) -> activating(candidate): run onStart, then succeed.
    if (
      from.operation?.type === 'admitted' &&
      to.operation?.type === 'candidate'
    ) {
      this.#start(to);
      return;
    }

    // activating(candidate) -> dragging(active): begin active rendering.
    if (from.phase === 'activating' && to.phase === 'dragging') {
      this.#render(to);
      return;
    }

    // dragging -> dragging: render committed motion.
    if (
      from.phase === 'dragging' &&
      to.phase === 'dragging' &&
      to.motion !== from.motion
    ) {
      this.#render(to);
      this.#move(to);
      return;
    }

    // dragging -> awaiting-result: proposal-ready; render release, start resolution.
    if (from.phase === 'dragging' && to.phase === 'awaiting-result') {
      this.#render(to);
      this.#startResolution(to);
      return;
    }

    // proposal-ready -> awaiting-consumer: invoke onDrop.
    if (
      from.drop.stage === 'proposal-ready' &&
      to.drop.stage === 'awaiting-consumer'
    ) {
      this.#invokeResolution(to);
      return;
    }

    // Settlement.
    if (to.phase === 'settling') {
      this.#settle(from, to, event);
      return;
    }

    // settling -> idle: dispose presentation, run completion callbacks.
    if (from.phase === 'settling' && to.phase === 'idle') {
      this.#complete(from);
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

    if (op?.type !== 'admitted' || !to.pointer) {
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

      const mode = LIFT_MODES[options.lift ?? 'top-layer'];
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
      this.#scope.interaction.use(() => capture.dispose());

      invalidation.arm(this.#scope.signal, () => {
        dispatch({
          type: 'invalidate',
          point: ORIGIN,
          bounds: this.#deps.currentBounds(),
        });
      });

      dispatch({
        type: 'activation-ready',
        operationId,
        candidate: { visual, lift: mode, originRect, coordinateSpace: derived },
      });
    } catch (error) {
      this.#reportCause(error, { stage: 'activation' }, null);
      this.#scope.settle();
      this.#scope.finish();
      dispatch({ type: 'activation-failed', operationId });
    }
  }

  #start(to: DraggableState): void {
    const { options, dispatch } = this.#deps;
    const op = to.operation;

    if (!op || op.type === 'admitted') {
      return;
    }

    try {
      options.onStart?.(freeGeometry(to));
      dispatch({ type: 'start-succeeded', operationId: op.operationId });
    } catch (error) {
      this.#reportCause(error, { stage: 'activation' }, null);
      this.#scope.settle();
      this.#scope.finish();
      dispatch({ type: 'activation-failed', operationId: op.operationId });
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
      options.onMove(freeGeometry(to));
    } catch (error) {
      const op = to.operation;
      this.#reportCause(error, { stage: 'move' }, null);
      this.#deps.dispatch({
        type: 'effect-failed',
        operationId: op?.operationId ?? 0,
        stage: 'move',
        recovery: 'home',
        error,
      });
    }
  }

  #startResolution(to: DraggableState): void {
    const op = to.operation;

    if (!op || op.type === 'admitted') {
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
      type: 'resolution-started',
      operationId: op.operationId,
      resolutionId,
    });
  }

  #invokeResolution(to: DraggableState): void {
    if (to.drop.stage !== 'awaiting-consumer' || !this.#resolution) {
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
      settlement.outcome.result === 'failed' &&
      from.settlement?.outcome.result !== 'failed'
    ) {
      const error =
        'error' in event ? (event as { error: unknown }).error : undefined;
      this.#reportCause(error, settlement.outcome.failure, settlement.domain);
    }

    // First entry into settling: abort interaction, prepare recovery.
    if (from.phase !== 'settling') {
      this.#scope.settle();

      if (settlement.landing.stage === 'skipped') {
        this.#deps.dispatch({ type: 'settlement-completed', operationId });
        return;
      }

      this.#resolveHome(to);
      return;
    }

    const { landing } = settlement;

    // preparing + plan committed: create the runner.
    if (
      landing.stage === 'preparing' &&
      landing.plan &&
      from.settlement?.landing.stage === 'preparing'
    ) {
      this.#startLanding(landing.currency, landing.plan);
      return;
    }

    // running -> completing: pin then finish landing.
    if (
      landing.stage === 'completing' &&
      from.settlement?.landing.stage === 'running'
    ) {
      this.#landing?.pin();
      this.#deps.dispatch({
        type: 'landing-pinned',
        operationId,
        landingId: landing.currency.landingId,
      });
      return;
    }

    // Refined to skipped (settlement/home failure): complete deterministically.
    if (
      landing.stage === 'skipped' &&
      from.settlement?.landing.stage !== 'skipped'
    ) {
      this.#deps.dispatch({ type: 'settlement-completed', operationId });
    }
  }

  #resolveHome(to: DraggableState): void {
    const { settlement } = to;
    const op = to.operation;

    if (
      settlement?.landing.stage !== 'preparing' ||
      !op ||
      op.type === 'admitted'
    ) {
      return;
    }

    const { currency } = settlement.landing;
    const { options } = this.#deps;

    if (!options.resolveHomeTarget) {
      this.#deps.dispatch({
        type: 'home-invalid',
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
        type: 'home-invalid',
        operationId: currency.operationId,
        landingId: currency.landingId,
        error,
      });
      return;
    }

    if (!isValidHomeTarget(target)) {
      this.#deps.dispatch({
        type: 'home-invalid',
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
      type: 'landing-plan-ready',
      operationId: currency.operationId,
      landingId: currency.landingId,
      plan,
    });
  }

  #startLanding(
    currency: { operationId: number; landingId: number },
    plan: { from: Point; target: Point },
  ): void {
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
          type: 'landing-finished',
          operationId: c.operationId,
          landingId: c.landingId,
        }),
      (c, error) =>
        this.#deps.dispatch({
          type: 'settlement-failed',
          operationId: c.operationId,
          landingId: c.landingId,
          stage: 'landing-interrupted',
          error,
        }),
    );
    this.#deps.dispatch({
      type: 'landing-started',
      operationId: currency.operationId,
      landingId: currency.landingId,
    });
  }

  #complete(from: DraggableState): void {
    const { settlement } = from;
    this.#scope.finish();
    this.#landing = null;
    this.#resolution = null;

    if (!settlement) {
      return;
    }

    const { options } = this.#deps;
    const { outcome } = settlement;

    if (
      outcome.result === 'accepted' &&
      settlement.domain?.type === 'accepted'
    ) {
      this.#guardCallback(
        () => options.onFinish?.(settlement.domain as FreeDragFinishResultLike),
        'finish-callback',
        settlement.domain,
      );
      return;
    }

    if (
      outcome.result === 'rejected' &&
      settlement.domain?.type === 'rejected'
    ) {
      this.#guardCallback(
        () => options.onCancel?.(settlement.domain as never),
        'cancel-callback',
        settlement.domain,
      );
      return;
    }

    if (outcome.result === 'canceled') {
      this.#guardCallback(
        () =>
          options.onCancel?.({
            type: 'canceled',
            reason: outcome.reason,
            proposal: null,
          }),
        'cancel-callback',
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

type FreeDragFinishResultLike = Extract<FreeDropResult, { type: 'accepted' }>;

// Referenced only for the FreeOperation type import stability.
export type { FreeOperation };
