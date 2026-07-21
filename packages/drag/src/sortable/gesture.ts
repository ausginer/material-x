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
import { watchPresentationReady } from '../kernel/presentation-ready.ts';
import {
  acquireLift,
  createDragRenderer,
  LIFT_FAITHFUL,
  type DragRenderer,
  type VisualLiftSession,
} from '../kernel/presentation.ts';
import {
  LIFECYCLE_ACTIVATION_FAILED,
  LIFECYCLE_ACTIVATION_READY,
  FAILURE_ACTIVATION,
  FAILURE_CANCEL_CALLBACK,
  FAILURE_FINISH_CALLBACK,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_PRESENTATION_LEASE,
  FAILURE_REORDER_RESOLUTION,
  LANDING_COMPLETING,
  LANDING_PREPARING,
  LANDING_RUNNING,
  LANDING_SKIPPED,
  isLandingSettled,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  OPERATION_ADMITTED,
  OPERATION_CANDIDATE,
  OUTCOME_NO_OP,
  OUTCOME_REJECTED,
  PHASE_ACTIVATING,
  PHASE_DRAGGING,
  PHASE_IDLE,
  PHASE_PENDING,
  PHASE_SETTLING,
  RECOVERY_HOME,
  LIFECYCLE_START_SUCCEEDED,
  type LandingCurrency,
  type LandingPlan,
  type FailureCause,
} from '../kernel/protocol.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type { Disposer } from '../kernel/resource-scope.ts';
import type { AnimationTiming, Point } from '../kernel/types.ts';
import { anchorIndex } from './geometry.ts';
import { currentInsertion, resolveSpatialInsertion } from './insertion.ts';
import { destinationPlan, homePlan } from './landing.ts';
import type {
  Insertion,
  ReorderTransactionResult,
  SortableCancelResult,
  SortableFinishResult,
  SortableOptions,
} from './options.ts';
import {
  createAnchor,
  insertPlaceholder,
  type PlaceholderLease,
} from './placeholder.ts';
import {
  EFFECT_FAILED,
  INPUT_KEYBOARD,
  INSERTION_READY,
  INSERTION_RESOLVED,
  LANDING_FINISHED,
  LANDING_PINNED,
  LANDING_PLAN_READY,
  LANDING_STARTED,
  PROPOSAL_BUILT,
  REORDER_NOOP,
  RESOLUTION_STARTED,
  PRESENTATION_SETTLED,
  REORDER_RESOLVED,
  SETTLEMENT_COMPLETED,
  SETTLEMENT_FAILED,
  TRANSACTION_AWAITING_CONSUMER,
  TRANSACTION_PROPOSAL_READY,
  TRANSACTION_RESOLVING_PROPOSAL,
  type SortableEvent,
  type SortableState,
} from './reducer.ts';
import { buildReorderProposal } from './request.ts';
import {
  createReorderResolution,
  type ReorderResolutionEffect,
} from './resolution.ts';

const EASING_EASE = 'ease';
const DEFAULT_TIMING: AnimationTiming = { duration: 200, easing: EASING_EASE };

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
  #presentationWatchDisposer: Disposer | null = null;
  #originRect: DOMRectReadOnly;
  #lastPoint: Point | null = null;
  #lastDelta: Point = { x: 0, y: 0 };

  constructor(deps: SortableGestureDeps) {
    this.#deps = deps;
    // Placeholder until acquisition measures the real one; constructed from the
    // owning realm so no ambient global is touched.
    this.#originRect = new deps.realm.window.DOMRectReadOnly();
    this.#scope = createGestureScope((error) =>
      this.#report(error, { stage: FAILURE_PRESENTATION_LEASE }, null),
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
    if (from.phase === PHASE_PENDING && to.phase === PHASE_ACTIVATING) {
      this.#acquire(to);
      return;
    }
    if (
      from.operation?.type === OPERATION_ADMITTED &&
      to.operation?.type === OPERATION_CANDIDATE
    ) {
      this.#start(to);
      return;
    }
    if (from.phase === PHASE_ACTIVATING && to.phase === PHASE_DRAGGING) {
      this.#render(to);
      return;
    }
    if (from.phase === PHASE_DRAGGING && to.phase === PHASE_DRAGGING) {
      this.#drag(from, to);
      return;
    }
    if (
      to.transaction.stage === TRANSACTION_RESOLVING_PROPOSAL &&
      from.transaction.stage !== TRANSACTION_RESOLVING_PROPOSAL
    ) {
      this.#stabilize(to);
      return;
    }
    if (
      to.transaction.stage === TRANSACTION_PROPOSAL_READY &&
      from.transaction.stage !== TRANSACTION_PROPOSAL_READY
    ) {
      this.#afterProposal(to);
      return;
    }
    if (
      from.transaction.stage === TRANSACTION_PROPOSAL_READY &&
      to.transaction.stage === TRANSACTION_AWAITING_CONSUMER
    ) {
      this.#invoke(to);
      return;
    }
    if (to.phase === PHASE_SETTLING) {
      this.#settle(from, to, event);
      return;
    }
    if (from.phase === PHASE_SETTLING && to.phase === PHASE_IDLE) {
      this.#complete(from);
      return;
    }
    // pending -> idle: the press never activated, so there is no outcome to
    // report — but the armed document listeners must still go, or every click
    // on a sortable item leaks one session's worth of them.
    if (from.phase === PHASE_PENDING && to.phase === PHASE_IDLE) {
      this.#scope.disarm();
      this.#scope.finish();
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
    if (op?.type !== OPERATION_ADMITTED || !to.pointer) {
      return;
    }
    const { realm, options, visual, invalidation, dispatch } = this.#deps;
    const { operationId } = op;
    const snapshot = op.operationCollection;

    try {
      const originRect = visual.getBoundingClientRect();
      this.#originRect = originRect;

      const context = op.item.offsetParent;
      const mapper = createMapper(
        context instanceof realm.window.HTMLElement
          ? context
          : realm.document.documentElement,
        realm,
      );
      // Lift before the placeholder exists. The placeholder occupies a slot
      // while the item is still in flow, so inserting it first grows the
      // container by one item — and in any layout that distributes free space
      // (centered, wrapping, space-between) that reflow moves the item itself.
      // The lift would then bake a stale origin into its base matrix and the
      // visual would visibly jump at activation.
      const lift = acquireLift(
        visual,
        LIFT_FAITHFUL,
        originRect,
        (d) => mapper.deltaFromViewport(d),
        realm,
      );
      this.#lift = lift;
      this.#renderer = createDragRenderer(lift);

      // Now that the item is out of flow, the placeholder replaces it in the
      // same slot, so the container's size never changes.
      const anchor = createAnchor(options, realm, op.item, visual, originRect);
      const placeholder = insertPlaceholder(anchor, op.item);
      // Registered before the lift's disposer even though it is acquired after:
      // the scope disposes LIFO, and teardown must return the item to flow
      // before the placeholder leaves it, or release reproduces the same jump.
      this.#scope.presentation.use(() => placeholder.dispose());
      this.#placeholder = placeholder;
      this.#scope.presentation.use(() => lift.dispose());

      const capture = acquirePointerCapture(op.item, to.pointer.id);
      this.#scope.interaction.use(capture);

      this.#frame = createFrameTask<Point>(realm, (point) =>
        this.#resolveInsertion(point),
      );

      // On scroll/resize, re-render at the last pointer and re-resolve insertion
      // so the preview keeps up with a moved layout.
      invalidation.arm(this.#scope.signal, () => {
        const current = this.#currentOperation;
        if (current && current.type !== OPERATION_ADMITTED && this.#lastPoint) {
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
        type: LIFECYCLE_ACTIVATION_READY,
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
      this.#report(error, { stage: FAILURE_ACTIVATION }, null);
      this.#scope.settle();
      this.#scope.finish();
      dispatch({ type: LIFECYCLE_ACTIVATION_FAILED, operationId });
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
        type: LIFECYCLE_START_SUCCEEDED,
        operationId: op.operationId,
      });
    } catch (error) {
      this.#report(error, { stage: FAILURE_ACTIVATION }, null);
      this.#scope.settle();
      this.#scope.finish();
      this.#deps.dispatch({
        type: LIFECYCLE_ACTIVATION_FAILED,
        operationId: op.operationId,
      });
    }
  }

  #render(to: SortableState): void {
    this.#renderer?.render(sortableDelta(to));
  }

  #drag(from: SortableState, to: SortableState): void {
    if (to.pointer?.latest === from.pointer?.latest) {
      // A committed insertion change (spatial resolution or collection rebase) is
      // the sole trigger for moving the placeholder to the ready gap.
      if (
        to.insertion.type === INSERTION_READY &&
        to.insertion !== from.insertion &&
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
      op.type === OPERATION_ADMITTED ||
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
        type: INSERTION_RESOLVED,
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

  // Stabilizes the transferred basis into an immutable proposal. Keyboard uses
  // the commanded gap directly; pointer resolves a spatial gap from the true
  // release point, falling back to the basis incumbent. Both feed one factory,
  // so an engine no-op and a real move share request semantics.
  #stabilize(to: SortableState): void {
    const tx = to.transaction;
    const op = to.operation;
    const placeholder = this.#placeholder;
    this.#frame?.cancel();

    if (
      tx.stage !== TRANSACTION_RESOLVING_PROPOSAL ||
      !op ||
      op.type === OPERATION_ADMITTED ||
      !placeholder ||
      !to.pointer
    ) {
      return;
    }

    const { snapshot, incumbent } = tx.basis;

    let insertion: Insertion | null;
    if (op.input === INPUT_KEYBOARD) {
      // The keyboard command carries its destination gap as the basis incumbent.
      insertion = incumbent;
    } else {
      const resolved = resolveSpatialInsertion(
        placeholder,
        snapshot.items,
        op.item,
        this.#deps.getVisual,
        to.pointer.release ?? to.pointer.latest,
        snapshot.version,
      );
      insertion =
        resolved ??
        incumbent ??
        currentInsertion(
          placeholder,
          snapshot.items,
          op.item,
          snapshot.version,
        );
    }

    // Seat the placeholder at the final committed gap; the landing plan targets
    // the placeholder's slot.
    if (insertion) {
      placeholder.placeBefore(insertion.after);
    }

    const build =
      insertion && buildReorderProposal(snapshot, op.item, insertion);

    if (!build) {
      this.#deps.dispatch({
        type: EFFECT_FAILED,
        operationId: op.operationId,
        stage: FAILURE_REORDER_RESOLUTION,
        error: new Error('drag: could not build a reorder proposal'),
      });
      return;
    }

    this.#render(to);
    this.#deps.dispatch(
      build.noop
        ? {
            type: REORDER_NOOP,
            operationId: op.operationId,
            proposal: build.proposal,
          }
        : {
            type: PROPOSAL_BUILT,
            operationId: op.operationId,
            proposal: build.proposal,
          },
    );
  }

  #afterProposal(to: SortableState): void {
    if (to.transaction.stage !== TRANSACTION_PROPOSAL_READY || !to.operation) {
      return;
    }
    const { operationId } = to.operation;

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
      type: RESOLUTION_STARTED,
      operationId,
      resolutionId,
    });
  }

  #invoke(to: SortableState): void {
    if (
      to.transaction.stage !== TRANSACTION_AWAITING_CONSUMER ||
      !this.#resolution
    ) {
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
      settlement.outcome.result === OUTCOME_FAILED &&
      from.settlement?.outcome.result !== OUTCOME_FAILED
    ) {
      const error =
        'error' in event ? (event as { error: unknown }).error : undefined;
      this.#report(error, settlement.outcome.failure, settlement.domain);
    }

    if (from.phase !== PHASE_SETTLING) {
      this.#scope.settle();
      this.#watchPresentation(event);

      if (settlement.landing.stage === LANDING_SKIPPED) {
        this.#deps.dispatch({ type: SETTLEMENT_COMPLETED, operationId });
        return;
      }
      this.#prepareLanding(to);
      return;
    }

    const { landing } = settlement;

    // The authored-presentation barrier settled. On success with landing still
    // running there is nothing to do — landing drives completion. Otherwise
    // this is the last barrier, and a failed acknowledgement has replaced the
    // settlement with a fresh home recovery that nothing else would run.
    if (event.type === PRESENTATION_SETTLED) {
      if (landing.stage === LANDING_PREPARING && !landing.plan) {
        this.#prepareLanding(to);
      } else if (isLandingSettled(landing)) {
        this.#deps.dispatch({ type: SETTLEMENT_COMPLETED, operationId });
      }
      return;
    }

    if (
      landing.stage === LANDING_PREPARING &&
      landing.plan &&
      from.settlement?.landing.stage === LANDING_PREPARING
    ) {
      this.#startLanding(landing.currency, landing.plan);
      return;
    }
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
    if (
      landing.stage === LANDING_SKIPPED &&
      from.settlement?.landing.stage !== LANDING_SKIPPED
    ) {
      this.#deps.dispatch({ type: SETTLEMENT_COMPLETED, operationId });
    }
  }

  #prepareLanding(to: SortableState): void {
    const { settlement } = to;
    const placeholder = this.#placeholder;
    if (settlement?.landing.stage !== LANDING_PREPARING || !placeholder) {
      return;
    }
    const { currency } = settlement.landing;

    // A disconnected visual (e.g. the item was removed from the collection) has
    // no home or destination to animate toward; complete without a landing.
    if (!this.#lift?.visual.isConnected) {
      this.#deps.dispatch({
        type: SETTLEMENT_COMPLETED,
        operationId: currency.operationId,
      });
      return;
    }

    let plan;
    if (settlement.recovery === RECOVERY_HOME) {
      // Reserve the home slot behind the animating visual, then aim at the origin.
      placeholder.returnHome();
      plan = homePlan(sortableDelta(to));
    } else {
      plan = destinationPlan(
        placeholder.rect(),
        this.#originRect,
        sortableDelta(to),
      );
    }
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
  #watchPresentation(event: SortableEvent): void {
    if (
      event.type !== REORDER_RESOLVED ||
      !event.resolution.presentationReady
    ) {
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

  #complete(from: SortableState): void {
    const { settlement } = from;
    this.#scope.finish();
    this.#presentationWatchDisposer?.();
    this.#presentationWatchDisposer = null;
    this.#landing = null;
    this.#resolution = null;
    this.#placeholder = null;
    if (!settlement) {
      return;
    }
    const { options } = this.#deps;
    const { outcome, domain } = settlement;

    if (
      (outcome.result === OUTCOME_ACCEPTED ||
        outcome.result === OUTCOME_NO_OP) &&
      domain
    ) {
      this.#guard(
        () => options.onFinish?.(domain as SortableFinishResult),
        FAILURE_FINISH_CALLBACK,
        domain,
      );
      return;
    }
    if (
      (outcome.result === OUTCOME_REJECTED ||
        outcome.result === OUTCOME_CANCELED) &&
      domain
    ) {
      this.#guard(
        () => options.onCancel?.(domain as SortableCancelResult),
        FAILURE_CANCEL_CALLBACK,
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
