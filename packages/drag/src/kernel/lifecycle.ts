/**
 * The operation lifecycle both features run, and the two-frame transaction
 * primitives that publish it.
 *
 * Draggable and sortable arrived at this phase sequence independently and with
 * identical semantics, so it is a proven shared concept rather than a
 * speculative abstraction. Each feature still owns its own frame shape, its own
 * action table and its own handlers — only the vocabulary and the commit
 * mechanics live here.
 *
 * It also owns the consumer-resolution attempt shape, since an attempt's
 * lifetime is a lifecycle concern: it is opened on release and retired with the
 * operation.
 */

import { OUTCOME_ACCEPTED, OUTCOME_REJECTED } from './protocol.ts';

/** No operation. The only phase that admits input. */
export const IDLE = 0;
/** Admitted; below the activation threshold. */
export const PENDING = 1;
/** Presentation acquired and committed; `onStart` in flight. */
export const ACTIVATING = 2;
/** The operation is live and tracking input. */
export const ACTIVE = 3;
/** Input closed, geometry final, consumer resolving. Nothing can move it now. */
export const RELEASING = 4;
/** Outcome committed; awaiting the landing and readiness gates. */
export const SETTLING = 5;
/** `onError` in flight. */
export const REPORTING = 6;
/** Presentation released; terminal callback in flight. */
export const FINALIZING = 7;

/** Sentinel for "no pointer owns this frame". Real pointer ids are >= 0. */
export const NO_POINTER = -1;

/**
 * One operation's identity. A bare object: identity comparison is cheaper and
 * more robust than a counter, and it cannot collide across controllers.
 */
export type OperationIdentity = object;

/** Any runtime carrying a committed frame and its reusable candidate. */
export type TransactionalFrames<Frame> = {
  current: Frame;
  draft: Frame;
};

/**
 * Copies the committed frame into the reusable draft and returns it for
 * mutation. The copy is shallow, so every frame field must be a scalar, an
 * immutable value, or replace-on-write.
 */
export function beginTransition<Frame extends object>(
  runtime: TransactionalFrames<Frame>,
): Frame {
  Object.assign(runtime.draft, runtime.current);
  return runtime.draft;
}

/** Publishes the draft by swapping the two frame references. Cannot throw. */
export function commitTransition<Frame extends object>(
  runtime: TransactionalFrames<Frame>,
): void {
  const previous = runtime.current;
  runtime.current = runtime.draft;
  runtime.draft = previous;
}

/**
 * Whether an action preparing work for `operation` may still touch anything
 * observable. Consumer code can reenter between preparation steps, so this is
 * re-checked after every callback and factory.
 */
export function preparationValid(
  runtime: Readonly<{
    closed: boolean;
    destroyRequested: boolean;
    cancelRequest: Readonly<{ operation: OperationIdentity }> | null;
    current: Readonly<{ operation: OperationIdentity | null }>;
  }>,
  operation: OperationIdentity,
): boolean {
  return (
    !runtime.closed &&
    !runtime.destroyRequested &&
    runtime.cancelRequest?.operation !== operation &&
    runtime.current.operation === operation
  );
}

/**
 * Whether `operation` is still the one the committed frame is running. Every
 * async continuation and post-callback resumption revalidates through this
 * before touching anything observable.
 */
export function isCurrentOperation(
  runtime: Readonly<{
    closed: boolean;
    current: Readonly<{ operation: OperationIdentity | null }>;
  }>,
  operation: OperationIdentity | null,
): boolean {
  return (
    !runtime.closed &&
    operation !== null &&
    runtime.current.operation === operation
  );
}

/**
 * A resolution that settled exactly once. Discriminated rather than nullable, so
 * a fulfilled `undefined` and a rejected `undefined` stay distinguishable.
 */
export type ResolutionSettlement =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ ok: false; reason: unknown }>;

export type ResolutionAttempt = {
  controller: AbortController;
  /**
   * Whether the resolver produced a result. Deliberately distinct from
   * `settlement`, which is cleared once consumed — a completed resolution must
   * never have its signal aborted, so the guard cannot key off the payload.
   */
  completed: boolean;
  settlement: ResolutionSettlement | null;
};

/** A fresh, unsettled attempt. */
export function createResolutionAttempt(): ResolutionAttempt {
  return {
    controller: new AbortController(),
    completed: false,
    settlement: null,
  };
}

/** Whether a consumer returned a promise rather than a direct resolution. */
export function isThenable<T>(value: unknown): value is PromiseLike<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

/**
 * Whether a settled value is an explicit accept/reject resolution. Both features
 * require the consumer to be explicit: an arbitrary fulfilled value is a
 * failure, not a silent acceptance.
 */
export function isExplicitResolution(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { type } = value as { type?: unknown };
  return type === OUTCOME_ACCEPTED || type === OUTCOME_REJECTED;
}
