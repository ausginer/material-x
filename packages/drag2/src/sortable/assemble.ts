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
import type { SortableConfig } from './config.ts';
import type {
  FeatureContext,
  InsertionGeometry,
  SortableInstaller,
} from './feature.ts';
import type { PlaceholderSlot } from './placement.ts';
import {
  DEFAULT_THRESHOLD,
  type DisplacementHook,
  NOOP_START,
  requireFinite,
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
    // **Narrowed by the merge, not gone** (D-45). Two fragments can no longer
    // collide on a named capability *slot* — the merge resolved those before
    // anything ran — but two *installers* can still contribute the same
    // single-writer member, either plugin-to-plugin or plugin-to-axis. The
    // message says "twice" rather than naming a tier, because the pair is not
    // always two plugins and a diagnostic that guesses wrong is worse than one
    // that does not guess.
    throw new TypeError(`sortable: ${label} contributed twice`);
  }

  return next;
};

export function assemble(
  config: SortableConfig,
  context: FeatureContext,
): SortableSlots {
  let insertion: InsertionGeometry | null = null;
  let contributedPlaceholder: PlaceholderSlot | null = null;
  let startLanding: LandingStart | null = null;
  const beforeMove: DisplacementHook[] = [];
  const afterMove: DisplacementHook[] = [];
  const retireHooks: Disposer[] = [];

  // **Config errors are diagnosed before anything is constructed**, which is
  // only possible because the merge already ran (D-45). Under D-12 a missing
  // slot could not be known until every factory had already allocated.
  if (config.axis === undefined) {
    throw new TypeError('sortable: an axis — y() or xy() — is required');
  }

  if (typeof config.items !== 'function') {
    throw new TypeError('sortable: items must be a function');
  }

  if (typeof config.onReorder !== 'function') {
    throw new TypeError('sortable: onReorder must be a function');
  }

  // **Installation order is schema order** (D-57). Named capability slots
  // first, in the order the schema declares them, then plugins in array order;
  // `retireHooks` reverses the whole sequence. Fragment order survives only
  // inside `plugins`, and recovering a first-appearance order would mean
  // recording which fragment each slot arrived from — exactly the provenance
  // D-45 deleted.
  const installers: ReadonlyArray<SortableInstaller | undefined> = [
    config.axis,
    config.landing,
    ...(config.plugins ?? []),
  ];

  try {
    for (const install of installers) {
      if (install === undefined) {
        continue;
      }

      const contribution = install(context);

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
      contributedPlaceholder = claim(
        contributedPlaceholder,
        contribution.placeholder,
        'placeholder',
      );
      startLanding = claim(startLanding, contribution.startLanding, 'landing');

      if (contribution.beforeInsertionMove) {
        beforeMove.push(contribution.beforeInsertionMove);
      }

      if (contribution.afterInsertionMove) {
        afterMove.push(contribution.afterInsertionMove);
      }
    }

    if (insertion === null) {
      // The axis slot was filled, so its installer contributed no geometry —
      // a different failure from the missing-slot one diagnosed above, and
      // reachable only from a middle-tier installer that names the slot
      // without filling it.
      throw new TypeError(
        'sortable: the axis installer contributed no insertion geometry',
      );
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

    // Validated as a function above, before any installer ran.
    items: config.items,
    onReorder: config.onReorder,
    // Two normalization rules, because "optional callback" is not one thing.
    // `onStart` becomes a shared module-level no-op, so its call site needs no
    // null check and allocates nothing; the terminal callbacks stay nullable,
    // because their arguments are result objects that would otherwise be
    // constructed only to be discarded.
    onStart: config.onStart ?? NOOP_START,
    onEnd: config.onEnd ?? null,
    onError: config.onError ?? null,
    // **Validation moved into the merge and got stronger** (D-56). It used to
    // live in `callbacks()`, where it fired only for a config supplied through
    // that factory; here it fires for a config supplied any way at all.
    threshold: requireFinite(
      config.threshold ?? DEFAULT_THRESHOLD,
      'threshold',
      0,
    ),

    // **The config slot wins over a contributed one** (D-65). A consumer
    // writing `placeholder` is being explicit about the element; an installer
    // that also names the slot is providing a default for compositions that do
    // not.
    createPlaceholder: config.placeholder
      ? (placeholderContext) => config.placeholder!(placeholderContext)
      : contributedPlaceholder,
    getHandle: config.handle ?? null,
    getVisual: config.visual ?? null,
    // **`box(item) = visual(item)` by default** (D-43), applied here so no
    // downstream reader has to know the rule. Falling through to `null` when
    // neither is written keeps the minimal composition free of an identity call
    // per candidate per rebuild.
    getBox: config.box ?? config.visual ?? null,
    startLanding,

    beforeMove,
    afterMove,
    retireHooks,
  };
}
