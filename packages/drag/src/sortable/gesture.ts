/**
 * Interprets committed sortable transitions and owns their effect resources.
 * Reads every semantic value from `(from, to, event)` and retains only
 * mechanical references: gesture scope, placeholder/lift/capture leases, frame
 * task, renderer, current resolution effect, and current landing runner.
 */
import {
  createLandingRunner,
  type LandingRunner,
} from '../kernel/animation.ts';
import { createMapper } from '../kernel/coordinate.ts';
import { reportError_ } from '../kernel/errors.ts';
import {
  createGestureScope,
  type GestureScope,
} from '../kernel/gesture-scope.ts';
import {
  createFrameTask,
  type FrameTask,
  type InvalidationSource,
} from '../kernel/invalidation.ts';
import type { OperationIdentitySource } from '../kernel/operation-id.ts';
import { acquirePointerCapture } from '../kernel/pointer.ts';
import {
  acquireLift,
  createDragRenderer,
  type DragRenderer,
  type VisualLiftSession,
} from '../kernel/presentation.ts';
import type { FailureCause } from '../kernel/protocol.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type { AnimationTiming, Point } from '../kernel/types.ts';
import { anchorIndex } from './geometry.ts';
import { currentInsertion, resolveSpatialInsertion } from './insertion.ts';
import { destinationPlan } from './landing.ts';
import type { ReorderTransactionResult, SortableOptions } from './options.ts';
import {
  createAnchor,
  insertPlaceholder,
  type PlaceholderLease,
} from './placeholder.ts';
import type { SortableEvent, SortableState } from './reducer.ts';
import { buildReorderProposal } from './request.ts';
import {
  createReorderResolution,
  type ReorderResolutionEffect,
} from './resolution.ts';

const DEFAULT_TIMING: AnimationTiming = { duration: 200, easing: 'ease' };

export type SortableGestureDeps = Readonly<{
  realm: DOMRealm;
  ids: OperationIdentitySource;
  options: SortableOptions;
  visual: HTMLElement;
  getVisual(item: HTMLElement): HTMLElement;
  invalidation: InvalidationSource;
  dispatch(event: SortableEvent): void;
}>;

function sortableDelta(to: SortableState): Point {
  const p = to.pointer;
  return p
    ? { x: p.latest.x - p.origin.x, y: p.latest.y - p.origin.y }
    : { x: 0, y: 0 };
}

export class SortableGesture {
  readonly #deps: SortableGestureDeps;
  readonly #scope: GestureScope;
  #lift: VisualLiftSession | null = null;
  #renderer: DragRenderer | null = null;
  #placeholder: PlaceholderLease | null = null;
  #frame: FrameTask<Point> | null = null;
  #resolution: ReorderResolutionEffect | null = null;
  #landing: LandingRunner | null = null;
  #originRect: DOMRectReadOnly = new DOMRectReadOnly();
  #lastPoint: Point | null = null;
  #lastDelta: Point = { x: 0, y: 0 };

  constructor(deps: SortableGestureDeps) {
    this.#deps = deps;
    this.#scope = createGestureScope((error) =>
      this.#report(error, { stage: 'presentation-lease' }, null),
    );
  }

  get scope(): GestureScope {
    return this.#scope;
  }

  #report(
    error: unknown,
    cause: FailureCause,
    domain: ReorderTransactionResult | null,
  ): void {
    const { onError } = this.#deps.options;
    reportError_(
      error,
      onError ? (e) => onError(e, { cause, domain }) : undefined,
    );
  }

  handle(from: SortableState, to: SortableState, event: SortableEvent): void {
    if (from.phase === 'pending' && to.phase === 'activating') {
      this.#acquire(to);
      return;
    }
    if (
      from.operation?.type === 'admitted' &&
      to.operation?.type === 'candidate'
    ) {
      this.#start(to);
      return;
    }
    if (from.phase === 'activating' && to.phase === 'dragging') {
      this.#render(to);
      return;
    }
    if (from.phase === 'dragging' && to.phase === 'dragging') {
      this.#drag(from, to, event);
      return;
    }
    if (from.phase === 'dragging' && to.phase === 'awaiting-result') {
      this.#release(to);
      return;
    }
    if (
      to.transaction.stage === 'proposal-ready' &&
      from.transaction.stage !== 'proposal-ready'
    ) {
      this.#afterProposal(to);
      return;
    }
    if (
      from.transaction.stage === 'proposal-ready' &&
      to.transaction.stage === 'awaiting-consumer'
    ) {
      this.#invoke(to);
      return;
    }
    if (to.phase === 'settling') {
      this.#settle(from, to, event);
      return;
    }
    if (from.phase === 'settling' && to.phase === 'idle') {
      this.#complete(from);
    }
  }

  destroy(): void {
    this.#scope.settle();
    this.#landing?.destroy();
    this.#landing = null;
    this.#scope.finish();
  }

  #acquire(to: SortableState): void {
    const op = to.operation;
    if (op?.type !== 'admitted' || !to.pointer) {
      return;
    }
    const { realm, options, visual, invalidation, dispatch } = this.#deps;
    const { operationId } = op;
    const snapshot = op.operationCollection;

    try {
      const originRect = visual.getBoundingClientRect();
      this.#originRect = originRect;

      const anchor = createAnchor(options, realm, op.item, visual, originRect);
      const placeholder = insertPlaceholder(anchor, op.item);
      this.#scope.presentation.use(() => placeholder.dispose());
      this.#placeholder = placeholder;

      const context = op.item.offsetParent;
      const mapper = createMapper(
        context instanceof realm.window.HTMLElement
          ? context
          : realm.document.documentElement,
        realm,
      );
      const lift = acquireLift(
        visual,
        'faithful',
        originRect,
        (d) => mapper.deltaFromViewport(d),
        realm,
      );
      this.#scope.presentation.use(() => lift.dispose());
      this.#lift = lift;
      this.#renderer = createDragRenderer(lift);

      const capture = acquirePointerCapture(op.item, to.pointer.id);
      this.#scope.interaction.use(() => capture.dispose());

      this.#frame = createFrameTask<Point>(realm, (point) =>
        this.#resolveInsertion(point),
      );

      // On scroll/resize, re-render at the last pointer and re-resolve insertion
      // so the preview keeps up with a moved layout.
      invalidation.arm(this.#scope.signal, () => {
        const current = this.#currentOperation;
        if (current && current.type !== 'admitted' && this.#lastPoint) {
          this.#renderer?.render(this.#lastDelta);
          this.#resolveInsertion(this.#lastPoint);
        }
      });

      const insertion = currentInsertion(
        placeholder,
        snapshot.items,
        op.item,
        snapshot.version,
      );

      dispatch({
        type: 'activation-ready',
        operationId,
        candidate: {
          visual,
          activationVersion: snapshot.version,
          activationIndex: anchorIndex(
            snapshot.items,
            op.item,
            placeholder.element,
          ),
          insertion,
        },
      });
    } catch (error) {
      this.#report(error, { stage: 'activation' }, null);
      this.#scope.settle();
      this.#scope.finish();
      dispatch({ type: 'activation-failed', operationId });
    }
  }

  #start(to: SortableState): void {
    const op = to.operation;
    if (!op) {
      return;
    }
    try {
      this.#deps.options.onStart?.(op.item);
      this.#deps.dispatch({
        type: 'start-succeeded',
        operationId: op.operationId,
      });
    } catch (error) {
      this.#report(error, { stage: 'activation' }, null);
      this.#scope.settle();
      this.#scope.finish();
      this.#deps.dispatch({
        type: 'activation-failed',
        operationId: op.operationId,
      });
    }
  }

  #render(to: SortableState): void {
    this.#renderer?.render(sortableDelta(to));
  }

  #drag(from: SortableState, to: SortableState, event: SortableEvent): void {
    if (to.pointer?.latest === from.pointer?.latest) {
      // Insertion committed (rebase or spatial result): keep the placeholder in sync.
      if (
        event.type === 'snapshot' &&
        to.insertion.type === 'ready' &&
        this.#placeholder
      ) {
        this.#placeholder.placeBefore(to.insertion.value.after);
      }
      return;
    }
    this.#render(to);
    if (to.pointer) {
      this.#lastPoint = to.pointer.latest;
      this.#lastDelta = sortableDelta(to);
      this.#frame?.schedule(to.pointer.latest);
    }
  }

  #resolveInsertion(point: Point): void {
    const placeholder = this.#placeholder;
    // The reducer holds the authoritative operation collection; read it fresh.
    const op = this.#currentOperation;
    if (
      !placeholder ||
      !op ||
      op.type === 'admitted' ||
      !op.operationCollection
    ) {
      return;
    }
    const snapshot = op.operationCollection;
    const insertion = resolveSpatialInsertion(
      placeholder,
      snapshot.items,
      op.item,
      this.#deps.getVisual,
      point,
      snapshot.version,
    );
    if (insertion) {
      this.#deps.dispatch({
        type: 'insertion-resolved',
        operationId: op.operationId,
        insertion,
      });
    }
  }

  // Set by the facade before each dispatch cycle so effects can read the live op.
  #currentOperation: SortableState['operation'] = null;
  observe(state: SortableState): void {
    this.#currentOperation = state.operation;
  }

  #release(to: SortableState): void {
    const op = to.operation;
    const placeholder = this.#placeholder;
    this.#frame?.cancel();

    if (
      !op ||
      op.type === 'admitted' ||
      !op.operationCollection ||
      !placeholder ||
      !to.pointer
    ) {
      return;
    }

    const snapshot = op.operationCollection;
    const resolved = resolveSpatialInsertion(
      placeholder,
      snapshot.items,
      op.item,
      this.#deps.getVisual,
      to.pointer.release ?? to.pointer.latest,
      snapshot.version,
    );
    const insertion =
      resolved ??
      (to.insertion.type === 'ready'
        ? to.insertion.value
        : currentInsertion(
            placeholder,
            snapshot.items,
            op.item,
            snapshot.version,
          ));

    const build = buildReorderProposal(snapshot, op.item, insertion);

    if (!build) {
      this.#deps.dispatch({
        type: 'effect-failed',
        operationId: op.operationId,
        stage: 'reorder-resolution',
        error: new Error('drag: could not build a reorder proposal'),
      });
      return;
    }

    this.#render(to);
    this.#deps.dispatch({
      type: 'proposal-built',
      operationId: op.operationId,
      proposal: build.proposal,
      noop: build.noop,
    });
  }

  #afterProposal(to: SortableState): void {
    if (to.transaction.stage !== 'proposal-ready' || !to.operation) {
      return;
    }
    const { operationId } = to.operation;

    if (to.transaction.noop) {
      this.#deps.dispatch({ type: 'reorder-noop', operationId });
      return;
    }

    const resolutionId = this.#deps.ids.next();
    const resolution = createReorderResolution(
      { operationId, resolutionId },
      this.#deps.dispatch,
    );
    this.#resolution = resolution;
    this.#scope.interaction.useWhile(
      () => !resolution.completed(),
      () => resolution.abort(),
    );
    this.#deps.dispatch({
      type: 'resolution-started',
      operationId,
      resolutionId,
    });
  }

  #invoke(to: SortableState): void {
    if (to.transaction.stage !== 'awaiting-consumer' || !this.#resolution) {
      return;
    }
    this.#resolution.invoke(
      to.transaction.proposal.request,
      this.#deps.options.onReorder,
    );
  }

  #settle(from: SortableState, to: SortableState, event: SortableEvent): void {
    const { settlement } = to;
    if (!settlement) {
      return;
    }
    const operationId = to.operation?.operationId ?? 0;

    if (
      settlement.outcome.result === 'failed' &&
      from.settlement?.outcome.result !== 'failed'
    ) {
      const error =
        'error' in event ? (event as { error: unknown }).error : undefined;
      this.#report(error, settlement.outcome.failure, settlement.domain);
    }

    if (from.phase !== 'settling') {
      this.#scope.settle();

      if (settlement.landing.stage === 'skipped') {
        this.#deps.dispatch({ type: 'settlement-completed', operationId });
        return;
      }
      this.#prepareLanding(to);
      return;
    }

    const { landing } = settlement;

    if (
      landing.stage === 'preparing' &&
      landing.plan &&
      from.settlement?.landing.stage === 'preparing'
    ) {
      this.#startLanding(landing.currency, landing.plan);
      return;
    }
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
    if (
      landing.stage === 'skipped' &&
      from.settlement?.landing.stage !== 'skipped'
    ) {
      this.#deps.dispatch({ type: 'settlement-completed', operationId });
    }
  }

  #prepareLanding(to: SortableState): void {
    const { settlement } = to;
    const placeholder = this.#placeholder;
    if (settlement?.landing.stage !== 'preparing' || !placeholder) {
      return;
    }
    const { currency } = settlement.landing;
    const plan = destinationPlan(
      placeholder.rect(),
      this.#originRect,
      sortableDelta(to),
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

  #complete(from: SortableState): void {
    const { settlement } = from;
    this.#scope.finish();
    this.#landing = null;
    this.#resolution = null;
    this.#placeholder = null;
    if (!settlement) {
      return;
    }
    const { options } = this.#deps;
    const { outcome, domain } = settlement;

    if (
      (outcome.result === 'accepted' || outcome.result === 'no-op') &&
      domain
    ) {
      this.#guard(
        () =>
          options.onFinish?.(
            domain as Extract<
              ReorderTransactionResult,
              { type: 'accepted' | 'no-op' }
            >,
          ),
        'finish-callback',
        domain,
      );
      return;
    }
    if (
      (outcome.result === 'rejected' || outcome.result === 'canceled') &&
      domain
    ) {
      this.#guard(
        () =>
          options.onCancel?.(
            domain as Extract<
              ReorderTransactionResult,
              { type: 'rejected' | 'canceled' }
            >,
          ),
        'cancel-callback',
        domain,
      );
    }
  }

  #guard(
    fn: () => void,
    cause: FailureCause['stage'],
    domain: ReorderTransactionResult | null,
  ): void {
    try {
      fn();
    } catch (error) {
      this.#report(error, { stage: cause }, domain);
    }
  }
}
