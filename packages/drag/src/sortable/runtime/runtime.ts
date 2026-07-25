/**
 * The single sortable runtime container and its teardown paths.
 *
 * As with draggable, this module imports nothing from `actions.ts`: actions read
 * and mutate the container, the container knows nothing about actions.
 */
import type { LandingRunner } from '../../kernel/animation.ts';
import { reportError_ } from '../../kernel/errors.ts';
import type { FrameTask, Invalidator } from '../../kernel/invalidation.ts';
import {
  isCurrentOperation,
  type ResolutionAttempt as Attempt,
} from '../../kernel/lifecycle.ts';
import type { Disposer, OperationLifetimes } from '../../kernel/lifetimes.ts';
import type {
  DragRenderer,
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
import type { AnimationTiming } from '../../kernel/types.ts';
import type {
  ReorderResolution,
  ReorderTransactionResult,
  SortableOptions,
} from '../options.ts';
import { createRectIndex, type RectIndex } from '../rect-index.ts';
import {
  createStateFrame,
  resetStateFrame,
  type OperationIdentity,
  type SortableStateFrame,
} from './frames.ts';

/** Options frozen at construction. */
export type SortableConfig = Readonly<{
  threshold: number;
  getVisual(item: HTMLElement): HTMLElement;
  getHandle: SortableOptions['getHandle'];
  createPlaceholder: SortableOptions['createPlaceholder'];
  landingTiming: (() => AnimationTiming) | undefined;
  onStart: SortableOptions['onStart'];
  onReorder: SortableOptions['onReorder'];
  onFinish: SortableOptions['onFinish'];
  onCancel: SortableOptions['onCancel'];
  onError: SortableOptions['onError'];
}>;

export type ReadinessAttempt = {
  dispose: Disposer | null;
  error: unknown;
  settled: boolean;
};

export type LandingAttempt = {
  runner: LandingRunner | null;
  error: unknown;
};

/** One coalesced spatial frame. Compared by object identity. */
export type SpatialAttempt = Readonly<{ id: number }>;

export type CancelRequest = Readonly<{
  operation: OperationIdentity;
  reason: CancellationReason;
}>;

export type FailureContinuation = Readonly<{
  operation: OperationIdentity | null;
  cause: FailureCause;
  error: unknown;
  domain: ReorderTransactionResult | null;
  settle: boolean;
  recovery: number;
}>;

export type SortableRuntime = ActionQueue & {
  current: SortableStateFrame;
  draft: SortableStateFrame;

  readonly config: SortableConfig;
  readonly realm: DOMRealm;
  readonly container: HTMLElement;
  readonly invalidate: Invalidator;

  readonly ingress: AbortController;

  lifetimes: OperationLifetimes | null;
  lift: VisualLiftSession | null;
  renderer: DragRenderer | null;
  placeholder: HTMLElement | null;
  /** The visual's viewport rect at grab, the basis for every landing plan. */
  originRect: DOMRectReadOnly | null;

  /** Packed geometry cache, reused across an operation and rebuilt when dirty. */
  readonly rects: RectIndex;
  /** One coalesced spatial frame; the task is created with the runtime. */
  frame: FrameTask<SpatialAttempt> | null;
  pendingSpatial: SpatialAttempt | null;
  nextSpatialId: number;

  resolution: ResolutionAttempt | null;
  readiness: ReadinessAttempt | null;
  landing: LandingAttempt | null;

  cancelRequest: CancelRequest | null;
  pendingContinuation: FailureContinuation | null;
  destroyRequested: boolean;

  nextOperationId: number;
};

export type SortableRuntimeDeps = Readonly<{
  realm: DOMRealm;
  container: HTMLElement;
  invalidation: Invalidator;
  config: SortableConfig;
}>;

export function createSortableRuntime(
  deps: SortableRuntimeDeps,
): SortableRuntime {
  return {
    ...createActionQueue(),
    current: createStateFrame(),
    draft: createStateFrame(),
    config: deps.config,
    realm: deps.realm,
    container: deps.container,
    invalidate: deps.invalidation,
    ingress: new AbortController(),
    lifetimes: null,
    lift: null,
    renderer: null,
    placeholder: null,
    originRect: null,
    rects: createRectIndex(),
    frame: null,
    pendingSpatial: null,
    nextSpatialId: 1,
    resolution: null,
    readiness: null,
    landing: null,
    cancelRequest: null,
    pendingContinuation: null,
    destroyRequested: false,
    nextOperationId: 1,
  };
}

export function nextOperation(runtime: SortableRuntime): OperationIdentity {
  const id = runtime.nextOperationId;
  runtime.nextOperationId = id + 1;
  return { id };
}

export function nextSpatial(runtime: SortableRuntime): SpatialAttempt {
  const id = runtime.nextSpatialId;
  runtime.nextSpatialId = id + 1;
  return { id };
}

export function isCurrent(
  runtime: SortableRuntime,
  operation: OperationIdentity | null,
): boolean {
  return isCurrentOperation(runtime, operation);
}

export function reportFatal(error: unknown): void {
  reportError_(error, undefined);
}

/** Makes every in-flight async attempt inert and drops its staged payload. */
export function retireAttempts(runtime: SortableRuntime): void {
  const { resolution, readiness, landing, frame } = runtime;

  frame?.cancel();
  runtime.pendingSpatial = null;

  if (resolution) {
    runtime.resolution = null;

    if (!resolution.completed) {
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
 * placeholder and lift dropped, geometry cache emptied of DOM references, and
 * both frames scrubbed.
 */
export function retireOperation(runtime: SortableRuntime): void {
  retireAttempts(runtime);

  const { lifetimes } = runtime;

  if (lifetimes) {
    runtime.lifetimes = null;
    lifetimes.motion.dispose();
    lifetimes.cancellation.dispose();
    lifetimes.presentation.dispose();
  }

  runtime.lift = null;
  runtime.renderer = null;
  runtime.placeholder = null;
  runtime.originRect = null;
  runtime.cancelRequest = null;
  runtime.pendingContinuation = null;

  // The rect index holds one element reference per destination slot.
  const { rects } = runtime;
  rects.items.length = 0;
  rects.count = 0;
  rects.dirty = true;
  rects.version = -1;

  resetStateFrame(runtime.current);
  resetStateFrame(runtime.draft);
}

/** Terminal, silent, idempotent. Physical release completes before returning. */
export function destroyRuntime(runtime: SortableRuntime): void {
  if (runtime.closed) {
    return;
  }

  runtime.closed = true;
  runtime.destroyRequested = true;
  clearQueue(runtime);
  retireOperation(runtime);
  runtime.ingress.abort();
}

/** Terminal for the controller: tear down exactly once, then report. */
export function panicRuntime(runtime: SortableRuntime, error: unknown): void {
  destroyRuntime(runtime);
  reportFatal(error);
}

/** This feature's consumer-resolution attempt. */
export type ResolutionAttempt = Attempt<ReorderResolution>;
