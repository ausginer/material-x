/**
 * The behavior's **private** runtime — the one thing H-2 says the kernel can
 * neither name nor type (D-4).
 *
 * What lives here rather than in the frame part is everything that is *not*
 * transactional: the host and the slot record, which are per-controller; and
 * the three per-operation references the seams need after activation but which
 * no `prepare` decides — the lift session, the visual's grab rect, and the
 * captured local space.
 *
 * `axis` is here for the opposite reason to the rest: it **is** policy, but it
 * is policy the library re-reads rather than commits. `action.prepare` resolves
 * the source and `action.effect` writes the result, so the read is classified
 * and the write is post-commit, without the value ever occupying one of the
 * five frame fields B-8 fixes.
 *
 * Note what is **not** here: any rect, resolver or clamp belonging to `bounds()`
 * — the constraint owns its own state in its own closure, which is what makes a
 * composition without it carry none of it.
 */
import type { BehaviorLiftSession } from '../kernel/presentation.ts';
import type { KernelHost } from '../kernel/spec.ts';
import type { DragAxis } from './domain.ts';
import type { LocalSpace } from './geometry.ts';
import { DEFAULT_AXIS, type FreeDragSlots } from './slots.ts';

/**
 * Behavior action tags. Behavior-local: the kernel offsets them, and
 * `config.actionTags` is what lets `arm()` validate them and `dispatch`
 * bounds-check one.
 */
export const TAG_POLICY = 0;
export const TAG_POSITION = 1;
export const FREE_DRAG_ACTION_TAGS = 2;

export type FreeDragRuntime = {
  readonly host: KernelHost;
  readonly slots: FreeDragSlots;

  /**
   * The resolved axis. Read at activation and on `invalidate()`, **never per
   * sample** (D-71) — the hot path reads this field, not the consumer's source.
   */
  axis: DragAxis;

  /* per operation, cleared by `retire()` */
  /** The kernel's session, projected: no `rendered`, no `dispose` (D-35, I-34). */
  lift: BehaviorLiftSession | null;
  /** The visual's viewport rect at grab. The basis of every clamp and rect. */
  originRect: DOMRectReadOnly | null;
  /** The inherited linear part's inverse, captured once (D-72). */
  space: LocalSpace;
  /** The two elements one operation is about, for `home` and the request. */
  item: HTMLElement | null;
  visual: HTMLElement | null;
};

export function createFreeDragRuntime(
  host: KernelHost,
  slots: FreeDragSlots,
): FreeDragRuntime {
  return {
    host,
    slots,
    // Seeded from the default rather than from the source: resolving a consumer
    // function at construction would run consumer code outside any seam, and
    // the first real read happens at activation before anything can move.
    axis: typeof slots.axis === 'function' ? DEFAULT_AXIS : slots.axis,
    lift: null,
    originRect: null,
    space: null,
    item: null,
    visual: null,
  };
}
