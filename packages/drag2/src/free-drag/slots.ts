/**
 * The flat slot record: what the behavior actually reads, after the merge has
 * resolved every named slot and the assembler has run every installer.
 *
 * One property read and one call per site, no descriptor interpretation, and no
 * reference to a contribution object — the assembler drops those, which is what
 * makes an installer's private state unreachable from the behavior, the kernel
 * or a sibling installer.
 *
 * **Every optional callback stays nullable rather than being normalized to a
 * shared no-op**, and the reason is the argument rather than the call. The
 * sortable normalizes `onStart` because its argument is an element it already
 * holds; free drag's is a `DragGeometry` that has to be *built*, and building
 * one to hand to a no-op would put an allocation and a derived rect on the hot
 * path for a consumer that asked for neither. The null check is what lets the
 * whole geometry be skipped.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { LiftMode } from '../kernel/presentation.ts';
import type { LandingStart } from '../kernel/spec.ts';
import type {
  OnDragError,
  OnEnd,
  OnMove,
  OnStart,
  ResolveElement,
  ResolveHandle,
} from './config.ts';
import type { AxisSource, DragAxis, OnDrop, ResolveHome } from './domain.ts';
import type { MotionConstraint } from './feature.ts';

/** Parity: the shipped activation travel, and the sortable's own default. */
export const DEFAULT_THRESHOLD = 8;
/** Parity: `'both'`. Two comparisons on the hot path and no state (D-70). */
export const DEFAULT_AXIS: DragAxis = 'both';

export type FreeDragSlots = Readonly<{
  onDrop: OnDrop;

  getHandle: ResolveHandle | null;
  getVisual: ResolveElement | null;
  getHome: ResolveHome | null;

  onStart: OnStart | null;
  onMove: OnMove | null;
  onEnd: OnEnd | null;
  onError: OnDragError | null;

  /**
   * The scalar **or** the source, unresolved (D-71). Resolving it here would
   * make it construction-time policy; the behavior reads it at activation and
   * on `invalidate()`, which is what makes it live.
   */
  axis: DragAxis | AxisSource;
  threshold: number;
  liftMode: LiftMode;

  /** `null` when no `bounds()` and no third-party constraint was installed. */
  constrain: MotionConstraint | null;
  /** `null` when no landing is installed: the visual is released without animating. */
  startLanding: LandingStart | null;

  /** Reverse installation order, ready to run (D-57). */
  retireHooks: readonly Disposer[];
}>;
