/**
 * The flat slot record: what the behavior reads, after the merge has resolved
 * every named slot and the assembler has run every installer.
 *
 * Each site does one property read and one call, with no descriptor
 * interpretation and no reference to a contribution object. The assembler drops
 * those objects, so the behavior, the kernel and a sibling installer cannot
 * reach an installer's private state.
 *
 * Every optional callback stays nullable and is not normalized to a shared
 * no-op. The reason is the argument and not the call. The sortable normalizes
 * `onStart` because its argument is an element it already holds. Free drag's
 * argument is a `DragGeometry` that must be built, and building one for a no-op
 * would put an allocation and a derived rect on the hot path for a consumer
 * that asked for neither. The null check lets the behavior skip the whole
 * geometry.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { LiftMode } from '../kernel/presentation.ts';
import type { LandingTiming } from '../shared/composition.ts';
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
   * Fixed configuration, not a source. Its value applies to accumulated travel
   * and not to the present position, so a live axis would be a command and not
   * policy.
   */
  axis: DragAxis;
  threshold: number;
  liftMode: LiftMode;

  /** `null` when no `bounds()` and no third-party constraint was installed. */
  constrain: MotionConstraint | null;
  /** `null` when no landing is installed: no landing animation runs. */
  landingTiming: LandingTiming | null;

  /** Installation order; every reader walks it backwards. */
  retireHooks: readonly Disposer[];
}>;
