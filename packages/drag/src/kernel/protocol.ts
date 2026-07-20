/**
 * The reusable, DOM-free lifecycle protocol shared by both features.
 *
 * {@link transitionKernelPhase} is the pure phase graph. It owns no current
 * state and performs no DOM work: given the previous phase and a lifecycle event
 * already classified by a feature, it returns the next phase. A feature root
 * reducer composes this with parallel semantic projections to build one complete
 * next state atomically.
 *
 * Pointer events are discriminated structurally (by known event-name / signal
 * strings), never via `instanceof PointerEvent`, so input originating in another
 * DOM realm remains valid.
 */
import type { Point } from './types.ts';

// Pointer event-name constants live here, in a neutral value module, so the
// protocol and the platform pointer source do not depend on each other.
export const POINTER_DOWN = 'pointerdown';
export const POINTER_MOVE = 'pointermove';
export const POINTER_UP = 'pointerup';
export const POINTER_CANCEL = 'pointercancel';
export const LOST_POINTER_CAPTURE = 'lostpointercapture';

/** The common lifecycle phase of one operation. */
export type DragPhase =
  | 'idle'
  | 'pending'
  | 'activating'
  | 'dragging'
  | 'awaiting-result'
  | 'settling';

/**
 * A lifecycle event, already classified by a feature from a raw event. The phase
 * graph reacts to `kind` alone; feature-specific payloads never reach it.
 */
export type LifecycleEvent = Readonly<{
  kind:
    | 'admit' // idle -> pending
    | 'disarm' // pending -> idle
    | 'activate' // pending -> activating
    | 'activation-ready' // activating -> activating (commit candidate)
    | 'start-succeeded' // activating -> dragging
    | 'activation-failed' // activating -> idle
    | 'move' // dragging -> dragging
    | 'release' // dragging -> awaiting-result
    | 'resolved' // awaiting-result -> settling
    | 'cancel' // dragging | awaiting-result -> settling
    | 'settle-progress' // settling -> settling
    | 'settle-complete' // settling -> idle
    | 'ignore'; // no phase edge
}>;

/**
 * The pure phase graph. An event whose kind defines no edge from `from` leaves
 * the phase unchanged, keeping foreign, duplicate, and stale events safe.
 *
 * ```text
 * idle -> pending -> activating -> dragging -> awaiting-result -> settling -> idle
 *           |            |
 *           +--> idle    +--> idle
 * ```
 */
export function transitionKernelPhase(
  from: DragPhase,
  event: LifecycleEvent,
): DragPhase {
  switch (event.kind) {
    case 'admit':
      return from === 'idle' ? 'pending' : from;
    case 'disarm':
      return from === 'pending' ? 'idle' : from;
    case 'activate':
      return from === 'pending' ? 'activating' : from;
    case 'activation-ready':
      // Commits candidate data while remaining in `activating`.
      return from;
    case 'start-succeeded':
      return from === 'activating' ? 'dragging' : from;
    case 'activation-failed':
      return from === 'activating' ? 'idle' : from;
    case 'release':
      return from === 'dragging' ? 'awaiting-result' : from;
    case 'resolved':
      return from === 'awaiting-result' ? 'settling' : from;
    case 'cancel':
      return from === 'dragging' || from === 'awaiting-result'
        ? 'settling'
        : from;
    case 'settle-complete':
      return from === 'settling' ? 'idle' : from;
    case 'move':
    case 'settle-progress':
    case 'ignore':
    default:
      return from;
  }
}

// ---------------------------------------------------------------------------
// Shared semantic value contracts. These are immutable value types, not one
// shared mutable "drag context".
// ---------------------------------------------------------------------------

/** The dedicated signal handed to a consumer resolver. */
export type ResolutionContext = Readonly<{
  signal: AbortSignal;
}>;

/** Currency identifying one consumer-resolution invocation. */
export type ResolutionCurrency = Readonly<{
  operationId: number;
  resolutionId: number;
}>;

/** Currency identifying one landing attempt. */
export type LandingCurrency = Readonly<{
  operationId: number;
  landingId: number;
}>;

/** Pointer identity and history, owned from admission until idle. */
export type PointerState = Readonly<{
  id: number;
  origin: Point;
  latest: Point;
  release: Point | null;
}>;

/** A committed landing animation's endpoints, viewport-space deltas. */
export type LandingPlan = Readonly<{
  from: Point;
  target: Point;
}>;

/** The landing sub-state of settlement. */
export type LandingState =
  | Readonly<{
      stage: 'preparing';
      currency: LandingCurrency;
      plan: LandingPlan | null;
    }>
  | Readonly<{
      stage: 'running';
      currency: LandingCurrency;
      plan: LandingPlan;
    }>
  | Readonly<{
      stage: 'completing';
      currency: LandingCurrency;
      plan: LandingPlan;
    }>
  | Readonly<{ stage: 'skipped' }>;

/** Stable classification of where a real execution failure occurred. */
export type FailureCause = Readonly<{
  stage:
    | 'move'
    | 'controlled-update'
    | 'invalidation'
    | 'scheduled-frame'
    | 'landing-timing'
    | 'animation-create'
    | 'landing-pin'
    | 'landing-interrupted'
    | 'home-target'
    | 'placeholder-target'
    | 'renderer-write'
    | 'presentation-lease'
    | 'drop-resolution'
    | 'reorder-resolution'
    | 'finish-callback'
    | 'cancel-callback'
    | 'activation';
}>;

/** Why an operation was cancelled. */
export type CancellationReason = Readonly<{
  type:
    | 'pointer-canceled'
    | 'escape'
    | 'consumer'
    | 'item-removed'
    | 'collection-invalidated';
  detail?: unknown;
}>;

/** The common settlement outcome, independent of feature domain result. */
export type SettlementOutcome =
  | Readonly<{ result: 'accepted' }>
  | Readonly<{ result: 'rejected' }>
  | Readonly<{ result: 'no-op' }>
  | Readonly<{ result: 'canceled'; reason: CancellationReason }>
  | Readonly<{ result: 'failed'; failure: FailureCause }>;

/** How a settling operation recovers its presentation. */
export type SettlementRecovery = 'destination' | 'home' | 'immediate';

/** The complete settlement slice, parameterised by feature domain result. */
export type SettlementState<DomainResult> = Readonly<{
  outcome: SettlementOutcome;
  recovery: SettlementRecovery;
  domain: DomainResult | null;
  landing: LandingState;
}>;

/** Context handed to a public `onError` callback. */
export type DragErrorContext<DomainResult> = Readonly<{
  cause: FailureCause;
  domain: DomainResult | null;
}>;
