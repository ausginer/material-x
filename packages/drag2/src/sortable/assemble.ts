/**
 * Construction-time assembly: a list of features in, one `SortableSlots` in
 * flat form out (contract 03 §Assembly).
 *
 * **The contribution objects are dropped.** After `assemble()` returns, the only
 * things that exist are the slot fields and the closures they hold — the feature
 * array, the contribution objects and every reference to either are garbage.
 * That is what makes the private feature state in contract 03 §Private feature
 * state unreachable from the behavior, the kernel, or a sibling feature.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { LandingStart } from '../kernel/spec.ts';
import {
  type FeatureContext,
  type InsertionGeometry,
  requireFinite,
  type SortableCallbacks,
  type SortableFeature,
  unbrandFeature,
} from './feature.ts';
import type { PlaceholderSlot } from './placement.ts';
import {
  DEFAULT_THRESHOLD,
  type DisplacementHook,
  NOOP_START,
  type SortableSlots,
} from './slots.ts';

/**
 * Single-writer enforcement. Checked with the full contribution in hand, so the
 * diagnostic can name the slot rather than only the second writer's position.
 */
const claim = <T>(
  current: T | null,
  next: T | undefined,
  label: string,
): T | null => {
  if (next === undefined) {
    return current;
  }

  if (current !== null) {
    throw new TypeError(`sortable: ${label} contributed by two features`);
  }

  return next;
};

export function assemble(
  features: readonly SortableFeature[],
  context: FeatureContext,
): SortableSlots {
  let insertion: InsertionGeometry | null = null;
  let callbacks: SortableCallbacks | null = null;
  let createPlaceholder: PlaceholderSlot | null = null;
  let getHandle: ((item: HTMLElement) => HTMLElement | null) | null = null;
  let getVisual: ((item: HTMLElement) => HTMLElement) | null = null;
  let startLanding: LandingStart | null = null;
  const beforeMove: DisplacementHook[] = [];
  const afterMove: DisplacementHook[] = [];
  const retireHooks: Disposer[] = [];

  try {
    for (const feature of features) {
      const contribution = unbrandFeature(feature)(context);

      // Cleanup is recorded **first**, before any claim can throw, and in
      // installation order. Recording it after the claim would leak the private
      // state of the very contribution whose claim collided — a second axis
      // feature has already allocated its rect index by the time `claim`
      // throws, and the unwind would only see the earlier contributions.
      // Recording it after the loop would put the axis feature's hook last in
      // installation order and therefore *first* after the reverse, which is
      // the opposite of the documented order for `[y(), …]`.
      if (contribution.insertion) {
        retireHooks.push(contribution.insertion.retire);
      }

      if (contribution.retire) {
        retireHooks.push(contribution.retire);
      }

      insertion = claim(
        insertion,
        contribution.insertion,
        'insertion geometry',
      );
      callbacks = claim(callbacks, contribution.callbacks, 'callbacks');
      createPlaceholder = claim(
        createPlaceholder,
        contribution.createPlaceholder,
        'placeholder()',
      );
      getHandle = claim(getHandle, contribution.getHandle, 'handle()');
      getVisual = claim(getVisual, contribution.getVisual, 'visual()');
      startLanding = claim(
        startLanding,
        contribution.startLanding,
        'landing()',
      );

      if (contribution.beforeInsertionMove) {
        beforeMove.push(contribution.beforeInsertionMove);
      }

      if (contribution.afterInsertionMove) {
        afterMove.push(contribution.afterInsertionMove);
      }
    }

    if (insertion === null) {
      // Axis-neutral since Phase 17 (D8, Checkpoint D): the slot is filled by
      // `y()` **or** `xy()`, so naming one of them described a valid `xy()`
      // composition as missing the feature it had.
      throw new TypeError(
        'sortable: an axis feature — y() or xy() — is required',
      );
    }

    if (callbacks === null) {
      throw new TypeError('sortable: callbacks({ onReorder }) is required');
    }

    if (typeof callbacks.onReorder !== 'function') {
      throw new TypeError('sortable: onReorder must be a function');
    }
  } catch (error) {
    // A later factory or a validation failing must not leak an earlier
    // feature's state. Factories are externally inert, so this is a retention
    // and diagnostics concern rather than a DOM leak — but the unwind is stated
    // as total, so it is total.
    for (let i = retireHooks.length - 1; i >= 0; i -= 1) {
      try {
        retireHooks[i]!();
      } catch (nested) {
        context.report(nested);
      }
    }

    throw error;
  }

  // Reversed exactly once: hooks release in reverse acquisition order.
  retireHooks.reverse();

  return {
    resolveInsertion: insertion.resolve,
    invalidateInsertion: insertion.invalidate,
    // Flattened like the other two, and normalized to `null` rather than to a
    // no-op: the behavior's call site is already inside a guarded branch, so a
    // null check costs nothing there and a shared no-op would hide from a
    // reader that the eager read is optional.
    measureInsertion: insertion.measure ?? null,

    onReorder: callbacks.onReorder,
    // Two normalization rules, because "optional callback" is not one thing.
    // `onStart` becomes a shared module-level no-op, so its call site needs no
    // null check and allocates nothing; the terminal callbacks stay nullable,
    // because their arguments are result objects that would otherwise be
    // constructed only to be discarded.
    onStart: callbacks.onStart ?? NOOP_START,
    onFinish: callbacks.onFinish ?? null,
    onCancel: callbacks.onCancel ?? null,
    onError: callbacks.onError ?? null,
    // Defaulted and range-checked in one place, because `callbacks()` is the
    // sole owner of both defaults and the only surface that can carry them.
    threshold: requireFinite(
      callbacks.threshold ?? DEFAULT_THRESHOLD,
      'threshold',
      0,
    ),

    createPlaceholder,
    getHandle,
    getVisual,
    startLanding,

    beforeMove,
    afterMove,
    retireHooks,
  };
}
