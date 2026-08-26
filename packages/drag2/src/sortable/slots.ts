/**
 * The flat slot record the behavior actually calls, and the consumer-declared
 * views features describe their inputs with (D-13).
 *
 * Phase 7's `assemble()` produces a `SortableSlots`; phase 6 takes one as an
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
 * whichever frame its seam was handed** — `Draft<Part>` inside a `prepare`,
 * `Readonly<Frame<Part>>` inside an `effect` — and structural typing does the
 * rest, so no view is ever materialized and neither `y.ts` nor `xy.ts` imports
 * the kernel slice or the behavior's part to say what it needs.
 *
 * **This is the widest view, not the required one.** A feature declares its own
 * narrower view in its own module and the behavior's frame satisfies both:
 * `y()` names `pointerY` and `item`, `xy()` names `pointerX` as well. The type
 * here is the ceiling the behavior guarantees to supply.
 */
export type InsertionFrameView = Readonly<{
  insertion: Insertion | null;
  /**
   * **Added in Phase 17**, for the two-dimensional rule (L-8). It is the second
   * widening of this view — 8a added `item` — and it was additive both times,
   * with the behavior's existing frame satisfying it structurally and no import
   * edge appearing back to the runtime. D-13's mechanism generalized; what the
   * two data points show is that the view is a *growing* structural contract
   * rather than a fixed one.
   */
  pointerX: number;
  pointerY: number;
  /**
   * The dragged item. **A deviation from the contract's two-field sketch**, and
   * a necessary one: the destination view is the collection minus the dragged
   * item, and an axis rule that cannot exclude it measures a lifted element
   * whose centre tracks the pointer — so it would win every search and pin the
   * gap to its own slot.
   *
   * Read off the frame rather than added to `InsertionRuntimeView`, because the
   * item is already committed frame state. Duplicating it onto the per-operation
   * view would create a second copy that a future seam could let drift.
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
   * **The axis rule measures candidate boxes, not candidate visuals** (D-58,
   * superseding parity D2's choice of node while keeping its reasoning). D2's
   * argument was coherence — the incumbent every candidate is compared against
   * is the placeholder, so both sides of the comparison must be the same kind
   * of rect — and it chose `visual` only because no `box` concept existed. It
   * does now, the placeholder occupies the **box's** removed footprint (D-43),
   * and so `box` is what the comparison has to be on. Leaving candidates on
   * `visual` would measure the incumbent one way and its challengers another:
   * a hysteresis defect, not a rounding one, and api-1 measured the two 30 px
   * apart.
   *
   * Under the default `box === visual` nothing changes, so the common case is
   * untouched.
   *
   * Nullable rather than normalized to identity, because the minimal
   * composition names neither slot and would otherwise pay an identity call per
   * candidate per rebuild.
   */
  getBox: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * Whether the controller is still alive (I-36).
   *
   * **The fourth additive widening of a consumer-declared view** — 8a `item`,
   * 17 `pointerX`, D2 `getVisual`, now this — and the per-operation view is the
   * designated channel for exactly this kind of per-operation behavior
   * guarantee. An axis rule that calls `getVisual` per candidate is calling
   * consumer code in a loop, and a resolver may destroy the controller; the
   * loop is feature-private, so the reading has to arrive as data.
   *
   * Read only between resolver calls, never on a warm cache.
   */
  live(): boolean;
  /**
   * The destination gap of the placeholder move currently being bracketed, or
   * `null` outside a bracket — the **same field, on the same per-operation
   * object**, that `DisplacementView.insertion` already publishes to the
   * displacement hooks.
   *
   * **The sixth additive widening of a consumer-declared view** — 8a `item`,
   * 17 `pointerX`, D2 `getVisual`, C2-01 `live`, C4-01 `live` on the
   * displacement side, now this — and the whole contract cost of P-06 (D-100
   * §The contract cost). The behavior's per-operation object satisfies it
   * already: `runtime.ts` declares `insertion: Insertion | null` and the
   * committed-move bracket writes it before `measureInsertion` is reached, so
   * there is no wrapper, no allocation and no import edge back to the runtime.
   *
   * **It is a reason signal, not a convenience.** `measureInsertion` has
   * exactly one call site, so an axis rule that sees a non-null gap here knows
   * a committed move just happened — which is what let P-06 stay inside one
   * additive field instead of widening `invalidateInsertion` with a reason
   * argument. `frame.insertion` could not do it: the frame's insertion outlives
   * the bracket, and it is being *inside* the bracket that the fast path needs
   * to establish.
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
   * kernel owns. Same widening, same reason, as `InsertionFrameView.item`.
   */
  item: HTMLElement;
  /**
   * The gap the placeholder is moving **to**. Meaningful only inside the
   * bracket — the hooks are the only readers, and they run nowhere else.
   *
   * This is M-4's answer made expressible (`.plan/measurements/
   * q7.md`). Without it a displacement feature cannot know which elements the
   * move affects until after the write, so it has to measure the whole
   * destination view twice: 2.3ms per committed move at 800 rows, against
   * 0.16ms for the span the move actually touches. The endpoints are what turn
   * an O(list) bracket into an O(distance) one.
   */
  insertion: Insertion;
  /**
   * Whether the controller is still alive (I-36).
   *
   * **The fifth additive widening of a consumer-declared view**, and the first
   * on the displacement side — 8a `item`, 17 `pointerX`, D2 `getVisual`, C2-01
   * `live` on `InsertionRuntimeView`, now this. C2-01 §9.5 recorded that the
   * per-operation view is the designated channel for exactly this kind of
   * per-operation behavior guarantee, so the fifth is a routine act.
   *
   * It is needed because a displacement hook measures **consumer-owned rows**
   * in a loop and then animates them: `getBoundingClientRect()` and `animate()`
   * on a consumer's element are consumer calls under I-36's indirect-invocation
   * clause, and the behavior cannot guard the interior of a hook it only calls
   * (C4-01). The same object already carries `live` for the axis rule, so this
   * costs one property in a type and nothing at runtime.
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
   * that (contract 03). Reading lazily on the next frame instead lands in the
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
   *
   * ~~`updateItems(payload)`~~ is gone with the second channel it belonged to;
   * ledger L-1's "the thunk is called exactly once, at construction" is
   * retracted with it.
   */
  items: ItemSource;
  onReorder: OnReorder;
  /**
   * Normalized to a shared no-op, so the call site needs no null check. It takes
   * an argument the behavior already has.
   */
  onStart(item: HTMLElement): void;

  /* optional; `null` when no feature filled them */
  createPlaceholder: PlaceholderSlot | null;
  getHandle: ((item: HTMLElement) => HTMLElement | null) | null;
  /** The node faithfully lifted (D-43). Resolved once, at admission. */
  getVisual: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * The geometry source (D-43). **Already defaulted to `getVisual` by the
   * assembler**, so this is `null` only when neither slot was written — which
   * is what lets both the admission path and the candidate loop skip the call
   * entirely rather than pay an identity per item.
   */
  getBox: ((item: HTMLElement) => HTMLElement) | null;
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

/**
 * ~~`requireFinite` — the one numeric-domain check every public option went
 * through.~~ **Deleted with the rule that required it** (D-77).
 *
 * It had three callers and none of them survives the re-derivation: `threshold`
 * is consumer-owned, because a value outside its domain starts no operation;
 * `layoutAnimation({ duration })` holds no gate, so an unbounded one costs the
 * library nothing; and `landing({ duration })` — the one option whose bad value
 * can hang the settlement gate — narrows to a single `=== Infinity` comparison
 * made at the landing, since `animate()` rejects every other out-of-domain
 * value itself and *accepts* `Infinity`, which it then never completes
 * (`.plan/measurements/animate-duration-domain.md`, D-79).
 *
 * Its own justification is what retired it: it argued a bad value would
 * otherwise be diagnosed "three seams later", and being diagnosed at a seam is
 * classification (D-64, D-66), not a defect.
 */
