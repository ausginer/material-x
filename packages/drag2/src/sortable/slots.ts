/**
 * The flat slot record the behavior actually calls, and the consumer-declared
 * views features describe their inputs with (D-13).
 *
 * The assembler produces a `SortableSlots` and the behavior takes one as an
 * argument. Nothing here knows what a feature is: by the time the behavior runs,
 * the contribution objects are gone and only these fields and their closures
 * exist.
 *
 * The shape is deliberately flat — `slots.resolveInsertion(...)` is one property
 * read and one call. The assembler flattens all four of `InsertionGeometry`'s
 * members — `resolve`, `invalidate`, the optional `measure`, and `retire` into
 * the unwind list — so the pairing is a construction-time claim rather than a
 * hot-path indirection.
 */
import type { DraggableError, DraggableWarning } from '../kernel/errors.ts';
import type { Disposer } from '../kernel/lifetimes.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type { LandingStart } from '../kernel/spec.ts';
import type { ItemSource, SortableOnEnd } from './config.ts';
import type { CollectionSnapshot, Insertion, OnReorder } from './domain.ts';
import type { PlaceholderSlot } from './placement.ts';

/**
 * The fields an axis rule may read off the frame. **The behavior passes
 * whichever frame its seam was handed** — a draft inside a `prepare`, a
 * readonly frame inside an `effect` — and structural typing does the rest, so
 * no view is ever materialized.
 *
 * **This is the widest view, not the required one.** A feature declares its own
 * narrower view in its own module and the behavior's frame satisfies both:
 * `y()` names `pointerY` and `item`, `xy()` names `pointerX` as well. The type
 * here is the ceiling the behavior guarantees to supply.
 */
export type InsertionFrameView = Readonly<{
  insertion: Insertion | null;
  /** Read by the two-dimensional rule; `y()` ignores it. */
  pointerX: number;
  pointerY: number;
  /**
   * The dragged item, or `null` before a lift. The destination view is the
   * collection minus this item, and an axis rule that cannot exclude it
   * measures a lifted element whose centre tracks the pointer — so it would win
   * every search and pin the gap to its own slot.
   *
   * It is read off the frame rather than off {@link InsertionRuntimeView}: the
   * item is already committed frame state, and duplicating it onto the
   * per-operation view would create a second copy that could drift.
   */
  item: HTMLElement | null;
}>;

/**
 * Non-frame state travels as a **second argument**, because frame state and
 * runtime state have separate owners and separate lifetimes. It is one small
 * per-operation object — the reason it is per-operation rather than
 * per-controller is `placeholder`, which cannot be non-null before activation.
 */
export type InsertionRuntimeView = Readonly<{
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
  /**
   * The installed `box` resolver, or `null` when the config names neither `box`
   * nor `visual`.
   *
   * **The axis rule measures candidate boxes, not candidate visuals.** The
   * incumbent every candidate is compared against is the placeholder, and the
   * placeholder occupies the **box's** removed footprint, so both sides of the
   * comparison are the same kind of rect. Measuring candidates as visuals
   * instead measures the incumbent one way and its challengers another, which
   * is a hysteresis defect rather than a rounding one.
   *
   * Under the default `box === visual` the two coincide, so the common case is
   * untouched.
   *
   * Nullable rather than normalized to identity, because the minimal
   * composition names neither slot and would otherwise pay an identity call per
   * candidate per rebuild.
   */
  box: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * Whether the controller is still alive.
   *
   * An axis rule that resolves a box per candidate is calling consumer code in
   * a loop, and such a call may destroy the controller; the loop is
   * feature-private, so the reading has to arrive as data. Read only between
   * resolver calls, never on a warm cache.
   */
  live(): boolean;
  /**
   * The destination gap of the placeholder move currently being bracketed, or
   * `null` outside a bracket — the **same field, on the same per-operation
   * object**, that `DisplacementView.insertion` publishes to the displacement
   * hooks.
   *
   * **It is a reason signal, not a convenience.** `measureInsertion` has
   * exactly one call site, so an axis rule that sees a non-null gap here knows
   * a committed move just happened. `frame.insertion` cannot say that: the
   * frame's insertion outlives the bracket, and it is being *inside* the
   * bracket that a fast path has to establish.
   *
   * An axis rule that ignores it is unaffected, which is what `xy()` does.
   */
  insertion: Insertion | null;
}>;

export type DisplacementView = Readonly<{
  realm: DOMRealm;
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
  /**
   * The dragged item, so a displacement feature can exclude it.
   *
   * Membership in `snapshot` cannot do it — the dragged item *is* a member —
   * and nothing else identifies it: the element the lift owns is not reachable
   * from here. It matters because the placeholder is inserted immediately after
   * the item, so **the dragged item is the first sibling of every backward
   * span**; a displacement that animates it fights the lift for the element the
   * kernel owns. Same reason as `InsertionFrameView.item`.
   */
  item: HTMLElement;
  /**
   * The gap the placeholder is moving **to**. Meaningful only inside the
   * bracket — the hooks are the only readers, and they run nowhere else.
   *
   * Without it a displacement feature cannot know which elements the move
   * affects until after the write, so it has to measure the whole destination
   * view twice. The endpoints are what turn an O(list) bracket into an
   * O(distance) one.
   */
  insertion: Insertion;
  /**
   * Whether the controller is still alive.
   *
   * A displacement hook measures **consumer-owned rows** in a loop and then
   * animates them, and `getBoundingClientRect()` and `animate()` on a
   * consumer's element are consumer calls: the behavior cannot guard the
   * interior of a hook it only calls, so a hook that loops reads this itself.
   */
  live(): boolean;
}>;

export type DisplacementHook = (view: DisplacementView) => void;

export type SortableSlots = Readonly<{
  /* required, filled by the axis feature */
  resolveInsertion(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
  ): Insertion | null;
  /**
   * The behavior's only way to say "the geometry you cached is stale". **Lazy
   * by contract**: scroll and resize call it many times a second, so it may not
   * read geometry.
   */
  invalidateInsertion(): void;
  /**
   * "Re-read your geometry **now**", or `null` when the axis feature offers no
   * eager path.
   *
   * The counterpart to the lazy invalidation above, and it exists for exactly
   * one instant: inside the committed-move bracket, after the placeholder has
   * been written and after every displacement feature has released its visual
   * offsets. That is the only window in an active drag in which a read yields
   * **settled presentation geometry**, and the axis rule is defined against
   * that. Reading lazily on the next frame instead lands in the
   * middle of a displacement animation and measures items where they no longer
   * are.
   */
  measureInsertion:
    | ((frame: InsertionFrameView, runtime: InsertionRuntimeView) => void)
    | null;

  /* required */
  /**
   * **The collection as a pull source** (D-44). Called by
   * `action.prepare(COLLECTION)` on every `controller.invalidate()`, and once
   * at construction for the initial snapshot — never memoized, because the
   * whole point is that the library re-reads it.
   */
  items: ItemSource;
  onReorder: OnReorder;
  /**
   * Normalized to a shared no-op, so the call site needs no null check. It takes
   * an argument the behavior already has.
   */
  onStart(item: HTMLElement): void;

  /* optional; `null` when no feature filled them */
  placeholder: PlaceholderSlot | null;
  handle: ((item: HTMLElement) => HTMLElement | null) | null;
  /** The node faithfully lifted (D-43). Resolved once, at admission. */
  visual: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * The geometry source (D-43). **Already defaulted to `visual` by the
   * assembler**, so this is `null` only when neither slot was written — which
   * is what lets both the admission path and the candidate loop skip the call
   * entirely rather than pay an identity per item.
   */
  box: ((item: HTMLElement) => HTMLElement) | null;
  startLanding: LandingStart | null;
  /**
   * These stay nullable rather than normalized: their arguments are result
   * objects that would otherwise be constructed only to be discarded.
   */
  onEnd: SortableOnEnd | null;
  onError: ((error: DraggableError | DraggableWarning) => void) | null;

  /**
   * Prebuilt and fixed-length after assembly, empty in the minimal composition,
   * and touched only around a committed placeholder move — never per pointer
   * move.
   */
  beforeMove: readonly DisplacementHook[];
  afterMove: readonly DisplacementHook[];
  /** Already reversed by the assembler: released in reverse install order. */
  retireHooks: readonly Disposer[];

  threshold: number;
}>;

/** The shared normalization target for an uninstalled `onStart`. */
export const NOOP_START = (): void => {};

export const DEFAULT_THRESHOLD = 8;
