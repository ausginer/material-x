/**
 * Public entrypoint for the sortable behavior — the **ordinary tier**.
 *
 * A consumer that composes a list reaches for this entry and `drag.js` and
 * nothing else: `sortable()` takes the root, calls `draggable()` internally and
 * returns its controller (D-48), so neither the kernel tier nor the installer
 * tier is on the ordinary path.
 *
 * `SortableConfig` and **every alias it names** are exported from here, resolved
 * within this tier and the tiers below it — `sortable.js ∪ drag.js ∪
 * sortable/feature.js` (D-78). A config slot a consumer can fill but cannot
 * hoist out of the object literal is not a writable surface. What the rule
 * protects is the ability to **hoist**: `AxisInstaller` ships from here because
 * `SortableConfig` names it; the names *it* reaches stay declared at
 * `sortable/feature.js`, one import away for an author who wants them.
 */
import { draggable } from './kernel.ts';
import { createComposedSortableBehavior } from './sortable/behavior.ts';
import type { SortableConfig } from './sortable/config.ts';
import type { SortableController } from './sortable/controller.ts';

export type { SortableController } from './sortable/controller.ts';
/**
 * The config schema **and every alias it names** (F-51). A public type that
 * references an unexported one is a surface a consumer cannot fully write down
 * — they could fill the slot but never hoist the handler out of the object
 * literal — so the aliases ship with it. `tests/docs.node.test.ts` enforces the
 * closure **per entry**: the whole-run form cannot see this class of hole in
 * either direction.
 */
export type {
  ItemSource,
  ResolveElement,
  ResolveHandle,
  SortableConfig,
  SortableOnDragError,
  SortableOnEnd,
  SortableOnStart,
} from './sortable/config.ts';
/**
 * **The installer slots' aliases, published here** (D-110). Each is named by
 * `SortableConfig` — `axis` by `AxisInstaller`, `landing?` by
 * `SortableLandingInstaller`, `plugins?` by `SortablePlugin` — so a consumer
 * who writes one can hoist it into a typed `const` rather than only fill the
 * slot inline. **Three since D-146**, because each key carries its own
 * installer and therefore its own contribution group. Their own closure —
 * `FeatureContext`, `AxisContribution`, `InsertionGeometry` — stays declared at
 * `sortable/feature.js`: this publishes the **names**, not the tier. Typing an
 * ordinary-tier config slot must never require importing the middle tier.
 */
export type {
  AxisInstaller,
  SortableLandingInstaller,
  SortablePlugin,
} from './sortable/feature.ts';
/**
 * The cancellation stages, as **values as well as a type**, for the same reason
 * as `FailureStage` on `drag.js`: a `CanceledReorderResult` carries one and a
 * consumer has to be able to discriminate it.
 */
export {
  AT_CONSUMER,
  AT_PROPOSAL,
  type CancelStage,
} from './kernel/failures.ts';
export type {
  AcceptedReorderResult,
  CanceledReorderResult,
  CollectionSnapshot,
  NoopReorderResult,
  OnReorder,
  RejectedReorderResult,
  ReorderProposal,
  ReorderRequest,
  ReorderTransactionResult,
} from './sortable/domain.ts';
export type {
  PlaceholderContext,
  PlaceholderFactory,
} from './sortable/placement.ts';

/**
 * A **runtime** export as well as a type: the documented consumer calls
 * `ReorderResolution.accept(…)` and `.reject(…)`, so listing it under types
 * only would make every documented example fail to run.
 */
export { ReorderResolution } from './sortable/domain.ts';

/**
 * Composes one sortable behavior **and returns its controller**. It takes the
 * ingress root itself, so an ordinary consumer never names the kernel tier.
 *
 * ```ts
 * const list = sortable(root, { items, onReorder, axis: y() }, landing());
 * ```
 *
 * **The second argument is a complete `SortableConfig`, and every later one is
 * `Partial`.** Required configuration is a **type** obligation: a missing
 * `items`, `onReorder` or `axis` is a compile error rather than a
 * construction-time `TypeError`. `y()` and `xy()` return the installer itself,
 * so an axis is written `axis: y()` in that first argument rather than passed
 * as a fragment.
 *
 * **What a later fragment cannot do is clear a required slot**: the merge skips
 * `undefined`, so `{ axis: undefined }` in a `Partial` leaves the merged slot
 * as the first argument set it.
 *
 * The features are **assembled once**, when the behavior is installed and a
 * realm exists — and then dropped. Nothing retains the feature array or the
 * contribution objects afterwards: only the flat slot record and the closures
 * it holds survive, which is what keeps a feature's private state unreachable
 * from the behavior, the kernel, or a sibling feature.
 *
 * The set of installed features is immutable for the controller's life. A
 * feature that wants live policy updates has to be given a controller method by
 * the *behavior*; it cannot contribute one.
 */
export function sortable(
  root: HTMLElement,
  config: SortableConfig,
  ...fragments: ReadonlyArray<Partial<SortableConfig>>
): SortableController {
  return draggable(root, createComposedSortableBehavior(config, fragments));
}
