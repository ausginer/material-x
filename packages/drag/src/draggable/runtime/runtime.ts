/**
 * The single runtime container and its teardown paths.
 *
 * Everything one draggable controller owns lives here: the action queue, the two
 * state frames, live policy, platform resources, and the replaceable async
 * attempts. Control moves; data stays put.
 *
 * This module deliberately imports nothing from `actions.ts`, so the dependency
 * runs one way: actions read and mutate the container, the container knows
 * nothing about actions.
 */
import type { LandingRunner } from '../../kernel/animation.ts';
import { reportError_ } from '../../kernel/errors.ts';
import type { InvalidationSource } from '../../kernel/invalidation.ts';
import type { OperationLifetimes } from '../../kernel/lifetimes.ts';
import type {
  DragRenderer,
  LiftMode as PresentationLiftMode,
  VisualLiftSession,
} from '../../kernel/presentation.ts';
import type {
  CancellationReason,
  FailureCause,
} from '../../kernel/protocol.ts';
import {
  clearQueue,
  createActionQueue,
  type ActionQueue,
} from '../../kernel/queue.ts';
import type { DOMRealm } from '../../kernel/realm.ts';
import type { Disposer } from '../../kernel/resource-scope.ts';
import type {
  AnimationTiming,
  CoordinateMapper,
  DragAxis,
} from '../../kernel/types.ts';
import type {
  DragBounds,
  DraggableOptions,
  FreeDropResolution,
  FreeDropResult,
  OnDrop,
  ResolveFreeHomeTarget,
} from '../options.ts';
import {
  createStateFrame,
  resetStateFrame,
  type DragStateFrame,
  type OperationIdentity,
} from './frames.ts';

/** Options frozen at construction. These never change for a controller. */
export type DraggableConfig = Readonly<{
  threshold: number;
  lift: PresentationLiftMode;
  resolveHomeTarget: ResolveFreeHomeTarget | undefined;
  hasHomeTarget: boolean;
  onStart: DraggableOptions['onStart'];
  onDrop: OnDrop;
  onFinish: DraggableOptions['onFinish'];
  onCancel: DraggableOptions['onCancel'];
  onError: DraggableOptions['onError'];
}>;

/**
 * Options `update()` may replace. Replace-on-write: a policy change swaps this
 * whole object, so an in-flight read never sees a half-applied update. It lives
 * outside the frames because it is controller-scoped, not operation-scoped.
 */
export type DraggablePolicy = Readonly<{
  axis: DragAxis;
  bounds: DragBounds | undefined;
  boundsVersion: number;
  coordinateSpace: CoordinateMapper | null;
  landingTiming: (() => AnimationTiming) | undefined;
  onMove: DraggableOptions['onMove'];
}>;

/** A consumer resolution that settled exactly once, fulfilled or rejected. */
export type ResolutionSettlement =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ ok: false; reason: unknown }>;

/**
 * One `onDrop` invocation. Owns its own `AbortController`; the cancellation
 * lifetime owns only the guarded registration that aborts it while unsettled.
 */
export type ResolutionAttempt = {
  controller: AbortController;
  settlement: ResolutionSettlement | null;
  resolution: FreeDropResolution | null;
};

/** One authored-presentation readiness watch. */
export type ReadinessAttempt = {
  dispose: Disposer | null;
  error: unknown;
  settled: boolean;
};

/** One landing animation. */
export type LandingAttempt = {
  runner: LandingRunner | null;
  error: unknown;
};

/** A latched cancellation request bound to the exact operation that owns it. */
export type CancelRequest = Readonly<{
  operation: OperationIdentity;
  reason: CancellationReason;
}>;

/**
 * A classified failure plus the state to resume from once `onError` returns.
 * Held on the container rather than in a frame because it is scaffolding for one
 * report, not committed semantic state.
 */
export type FailureContinuation = Readonly<{
  operation: OperationIdentity | null;
  cause: FailureCause;
  error: unknown;
  domain: FreeDropResult | null;
  /** Whether to resume in settlement; otherwise the operation retires. */
  settle: boolean;
  recovery: number;
}>;

export type DraggableRuntime = ActionQueue & {
  current: DragStateFrame;
  draft: DragStateFrame;

  readonly config: DraggableConfig;
  policy: DraggablePolicy;

  readonly realm: DOMRealm;
  readonly item: HTMLElement;
  readonly visual: HTMLElement;
  readonly invalidation: InvalidationSource;

  /** Controller-lifetime ingress. Aborted by destroy and by panic. */
  readonly ingress: AbortController;

  /** The three releasable stages of the live operation, or `null` when idle. */
  lifetimes: OperationLifetimes | null;
  lift: VisualLiftSession | null;
  renderer: DragRenderer | null;

  resolution: ResolutionAttempt | null;
  readiness: ReadinessAttempt | null;
  landing: LandingAttempt | null;

  /** Cached bounds rect for the current `boundsVersion`. */
  boundsRect: DOMRectReadOnly | null;
  boundsCachedVersion: number;

  cancelRequest: CancelRequest | null;
  pendingContinuation: FailureContinuation | null;
  destroyRequested: boolean;

  /** Monotonic source for operation identity. */
  nextOperationId: number;
};

export type DraggableRuntimeDeps = Readonly<{
  realm: DOMRealm;
  item: HTMLElement;
  visual: HTMLElement;
  invalidation: InvalidationSource;
  config: DraggableConfig;
  policy: DraggablePolicy;
}>;

export function createDraggableRuntime(
  deps: DraggableRuntimeDeps,
): DraggableRuntime {
  return {
    ...createActionQueue(),
    current: createStateFrame(),
    draft: createStateFrame(),
    config: deps.config,
    policy: deps.policy,
    realm: deps.realm,
    item: deps.item,
    visual: deps.visual,
    invalidation: deps.invalidation,
    ingress: new AbortController(),
    lifetimes: null,
    lift: null,
    renderer: null,
    resolution: null,
    readiness: null,
    landing: null,
    boundsRect: null,
    boundsCachedVersion: -1,
    cancelRequest: null,
    pendingContinuation: null,
    destroyRequested: false,
    nextOperationId: 1,
  };
}

/** Mints the next operation identity. */
export function nextOperation(runtime: DraggableRuntime): OperationIdentity {
  const id = runtime.nextOperationId;
  runtime.nextOperationId = id + 1;
  return { id };
}

/**
 * Whether `operation` is still the one the committed frame is running. Every
 * async continuation and every post-callback resumption revalidates through
 * this before touching anything observable.
 */
export function isCurrent(
  runtime: DraggableRuntime,
  operation: OperationIdentity | null,
): boolean {
  return (
    !runtime.closed &&
    operation !== null &&
    runtime.current.operation === operation
  );
}

/**
 * Reports an unexpected failure. Panics do not carry a `FailureCause`, so they
 * go to the platform reporter rather than to `onError`, which is reserved for
 * classified failures with a recovery policy.
 */
export function reportFatal(error: unknown): void {
  reportError_(error, undefined);
}

/** Makes every in-flight async attempt inert and drops its staged payload. */
export function retireAttempts(runtime: DraggableRuntime): void {
  const { resolution, readiness, landing } = runtime;

  if (resolution) {
    runtime.resolution = null;

    if (resolution.settlement === null) {
      resolution.controller.abort();
    }

    resolution.settlement = null;
    resolution.resolution = null;
  }

  if (readiness) {
    runtime.readiness = null;
    readiness.dispose?.();
    readiness.dispose = null;
    readiness.error = null;
  }

  if (landing) {
    runtime.landing = null;
    landing.runner?.destroy();
    landing.runner = null;
    landing.error = null;
  }
}

/**
 * Ends the current operation: attempts inert, all three lifetimes closed,
 * presentation handles dropped, and every operation-owned reference scrubbed
 * from both frames.
 *
 * This runs even when the controller stays alive and idle afterwards — an idle
 * controller must not pin the DOM of the drag it just finished.
 */
export function retireOperation(runtime: DraggableRuntime): void {
  retireAttempts(runtime);

  const { lifetimes } = runtime;

  if (lifetimes) {
    runtime.lifetimes = null;
    lifetimes.destroy();
  }

  runtime.lift = null;
  runtime.renderer = null;
  runtime.boundsRect = null;
  runtime.boundsCachedVersion = -1;
  runtime.cancelRequest = null;
  runtime.pendingContinuation = null;

  resetStateFrame(runtime.current);
  resetStateFrame(runtime.draft);
}

/**
 * Terminal, silent, idempotent teardown. Physical release happens before this
 * returns, so a consumer calling `destroy()` from inside a callback observes a
 * fully torn-down controller immediately.
 */
export function destroyRuntime(runtime: DraggableRuntime): void {
  if (runtime.closed) {
    return;
  }

  runtime.closed = true;
  runtime.destroyRequested = true;
  clearQueue(runtime);
  retireOperation(runtime);
  runtime.ingress.abort();
}

/**
 * An unexpected failure is terminal for the controller. Teardown runs first and
 * exactly once, then the initiating error is reported. A disposer that throws
 * during teardown is reported separately and never replaces this error.
 */
export function panicRuntime(runtime: DraggableRuntime, error: unknown): void {
  destroyRuntime(runtime);
  reportFatal(error);
}
