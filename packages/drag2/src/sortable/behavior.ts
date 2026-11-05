/**
 * The behavior instance: the one place that creates the spec and the
 * controller.
 *
 * ```ts
 * return {
 *   spec: createSortableSpec(kernel, source, items, slots),
 *   controller: createSortableController(kernel),
 * };
 * ```
 *
 * Both parts are returned at once, so the code cannot express admitting an
 * input before install returns. That property does not have to be a rule.
 *
 * Neither part receives a runtime object. Each takes the kernel, narrowed to
 * {@link BehaviorContext}, and the behavior's own state lives in the spec's
 * closure, where nothing outside can name it.
 *
 * Assembly happens inside the returned factory, not before it: a feature
 * factory receives `realm` and `root`, and neither exists until the kernel
 * does. The public `sortable(items, ...features)` entry lives in `sortable.ts`
 * and is the only caller that assembles.
 *
 * There are two factories, and each returns the handshake itself. They share no
 * `install`: it would only name two constructor calls, and writing those twice
 * is cheaper than a function that exists to be called from two places. What the
 * test entry point below protects does not depend on that indirection. Both
 * factories reach the same two constructors with the same arguments, so the
 * browser suite composes spec and controller exactly as production does. The
 * cost is that a third part of the handshake would have to be written twice,
 * and `BehaviorInstall` is the type that would catch a factory that forgot one.
 */
import { DraggableWarning } from '../kernel/errors.ts';
import type { BehaviorFactory } from '../kernel/spec.ts';
import { assemble } from './assemble.ts';
import { mergeFragments, type SortableConfig } from './config.ts';
import {
  createSortableController,
  type SortableController,
} from './controller.ts';
import type { SortableFramePart } from './frames.ts';
import type { SortableSlots } from './slots.ts';
import { createSortableSpec } from './spec.ts';

/**
 * Takes an already-assembled slot record.
 *
 * This is an internal test entry point, and it protects the wiring. It is not a
 * construction layer and does not duplicate the composed path. It calls the
 * same two constructors as the composed factory, so the browser suite composes
 * spec and controller exactly as production does, and not beside it, where a
 * test-local equivalent could drift. It adds reach: an already-flat
 * `SortableSlots` with states the public config cannot express, such as a stub
 * resolver, no placeholder factory, or the hook overrides that no
 * `SortableConfig` names. It cannot become public surface: its parameter type
 * is the type where `feature.ts` stops the published closure.
 *
 * This is a plain factory without a brand. `sortable()` returns its controller
 * directly, so there is no branded value for a consumer to hold, and a brand
 * would have no producer.
 */
export function createSortableBehavior(
  items: readonly HTMLElement[],
  slots: SortableSlots,
): BehaviorFactory<SortableController, SortableFramePart, HTMLElement> {
  // Copied here for the same reason as the composed path below: the collection
  // becomes the library's own at the boundary that receives it, so the behavior
  // never publishes a snapshot over an array the caller still holds. Both paths
  // copy and neither validates. The two paths must not drift apart: what they
  // share is taking ownership, not refusing input.
  //
  // `source` and the copy are separate arguments because they have separate
  // roles. `source` is the identity baseline that a later pull is compared
  // against, so it must be the caller's own array. The copy is what the
  // behavior publishes, and no caller may mutate it.
  return (kernel) => ({
    spec: createSortableSpec(kernel, items, [...items], slots),
    controller: createSortableController(kernel),
  });
}

/**
 * Merges the fragments, then assembles against the kernel's realm and root.
 *
 * The two stages are separate so that the merge resolves every named slot
 * before any installer runs. So last-wins is a merge rule and not a lifecycle
 * problem: a capability that loses its slot is never constructed, so there is
 * nothing to retire.
 *
 * The merge happens here and not at the `sortable()` call site because nothing
 * before this point is per-controller. Merging eagerly would compute a config
 * for a behavior that may never be installed.
 */
export function createComposedSortableBehavior(
  config: SortableConfig,
  fragments: ReadonlyArray<Partial<SortableConfig>>,
): BehaviorFactory<SortableController, SortableFramePart, HTMLElement> {
  const merged = mergeFragments(config, fragments);

  return (kernel) => {
    // The first pull. Every later pull goes through
    // `action.prepare(COLLECTION)`. This pull gives the initial snapshot and
    // the initial structural baseline, and it is the only `items()` call that
    // happens outside a transaction.
    //
    // Called without a guard. A `typeof` test here would route a non-function
    // `items` to an assembler diagnostic that does not exist. A non-callable
    // `items` is a required-config type violation and not a library invariant,
    // so the unavoidable construction call is left to fail naturally. Only a
    // later throw from a valid source, one that is a function and throws during
    // an `invalidate()`, belongs to `FAILURE_ACTION_PREPARE`.
    const source = merged.items();

    // Pull before the first installer runs, and keep this statement order. The
    // pull above is consumer code and may throw. It must not throw with
    // installer `retire` hooks recorded and unrun, because no rollback covers
    // this code and `arm()` is never reached.
    //
    // The pull and the assembly are separate statements, which keeps the order
    // safe. As sibling arguments to one call, the order would depend on
    // left-to-right evaluation. Swapping them is a change no reviewer would
    // flag, and it would leave every hook unrun.
    const items = [...source];
    const composition = kernel.channel((warning) => {
      merged.onError?.(warning);
    });

    return {
      spec: createSortableSpec(
        kernel,
        source,
        items,
        assemble(merged, {
          realm: kernel.realm,
          root: kernel.root,
          // The only route from composition rollback to the channel. `assemble`
          // runs before `arm()`, so no behavior spec exists yet. But
          // `merged.onError` is available here, and the kernel creates a
          // channel over it that already works during construction.
          //
          // `report`, not `fail`: a feature closure created here cannot know
          // which operation is live, so classifying a failure from that closure
          // would let a late continuation settle another operation.
          report: (error) => {
            composition(
              new DraggableWarning('drag: composition/unwind-failed', {
                cause: error,
              }),
            );
          },
        }),
      ),
      controller: createSortableController(kernel),
    };
  };
}
