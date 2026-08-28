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
  FreeDragOnDragError,
  FreeDragOnEnd,
  OnMove,
  FreeDragOnStart,
  ResolveElement,
  ResolveHandle,
} from './config.ts';
import type { DragAxis, OnDrop, ResolveHome } from './domain.ts';
import type { MotionConstraint } from './feature.ts';

/** `@ydinjs/drag`'s activation travel, and the sortable's own default. */
export const DEFAULT_THRESHOLD = 8;
/** Matches `@ydinjs/drag`. Two comparisons on the hot path, no state. */
export const DEFAULT_AXIS: DragAxis = 'both';

export type FreeDragSlots = Readonly<{
  onDrop: OnDrop;

  handle: ResolveHandle | null;
  visual: ResolveElement | null;
  home: ResolveHome | null;

  onStart: FreeDragOnStart | null;
  onMove: OnMove | null;
  onEnd: FreeDragOnEnd | null;
  onError: FreeDragOnDragError | null;

  /**
   * Fixed configuration, not a source. Its value is applied to accumulated
   * travel rather than to the present position, which is the property that
   * makes a live one a command rather than policy.
   */
  axis: DragAxis;
  threshold: number;
  liftMode: LiftMode;

  /** `null` when no `bounds()` and no third-party constraint was installed. */
  constrain: MotionConstraint | null;
  /** `null` when no landing is installed: the visual is released without animating. */
  startLanding: LandingStart | null;

  /** Installation order; every reader walks it backwards. */
  retireHooks: readonly Disposer[];
}>;
