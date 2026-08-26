/**
 * Public entrypoint for the sortable behavior — the **ordinary tier**.
 *
 * A consumer that composes a list reaches for this entry and `drag.js` and
 * nothing else: `sortable()` takes the root, calls `draggable()` internally and
 * returns its controller (D-48), so neither the kernel tier nor the installer
 * tier is on the ordinary path.
 *
 * `SortableConfig` and **every alias it names** are exported from here (F-51),
 * because a config slot a consumer can fill but cannot hoist out of the object
 * literal is not a writable surface. ~~`SortableFeature` is declared here~~ —
 * D-45 withdrew the feature brand, so a fragment is a plain partial config and
 * there is no branded type left to give a single identity to.
 *
 * **The closure is tier-scoped** (D-78). It resolves within this tier plus the
 * tiers below it — `sortable.js ∪ drag.js ∪ sortable/feature.js` — the way the
 * kernel tier's resolves within `kernel.js ∪ drag.js` (D-68). Taken literally,
 * _every alias it names_ transitively would publish `AxisInstaller`'s whole
 * closure here, which is substantially the whole middle tier, and D-61's rung
 * would dissolve into the ordinary one. What the rule protects is the ability
 * to **hoist**: `AxisInstaller` ships from here because `SortableConfig` names
 * it; the names *it* reaches stay declared at `sortable/feature.js`, which is
 * one import away for an author who wants them.
 */
import { draggable } from './kernel.ts';
import { createComposedSortableBehavior } from './sortable/behavior.ts';
import type { SortableConfig } from './sortable/config.ts';
import type { SortableController } from './sortable/controller.ts';

export type { SortableController } from './sortable/controller.ts';
/**
 * The config schema **and every alias it names** (D-45, F-51), resolved
 * **within this tier and the tiers below it** (D-78). A public type that
 * references an unexported one is a surface a consumer cannot fully write down
 * — they could fill the slot but never hoist the handler out of the object
 * literal — so the aliases ship with it. `tests/docs.node.test.ts` enforces the
 * closure rather than leaving it to review, **per entry**: the whole-run form
 * cannot see this class of hole in either direction (F-60), and `AxisInstaller`
 * resolving through `sortable/feature.js` read as clean for exactly that reason
 * (P18A-05).
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
 * **The installer slots' aliases, published here** (D-78, D-110). Every one of
 * them is named by `SortableConfig` — `axis` by `AxisInstaller`, `landing?` and
 * `plugins?` by `SortableInstaller` — so a consumer who writes one must be able
 * to hoist it into a typed `const` rather than only fill the slot inline. Their
 * own closure — `FeatureContext`, `SortableContribution`, `InsertionGeometry` —
 * stays declared at `sortable/feature.js`: this publishes the **names**, not the
 * tier.
 *
 * `SortableInstaller` was left behind when D-78 was applied to its sibling
 * (D-110), which made a sortable consumer import the **types-only middle tier**
 * to type an ordinary-tier config slot while the free-drag mirror published
 * `FreeDragInstaller` for its three. That is the tier inversion D-48 and D-64
 * each exist to prevent, reached by a third route.
 */
export type { AxisInstaller, SortableInstaller } from './sortable/feature.ts';
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
  AcceptedReorderResolution,
  AcceptedReorderResult,
  CanceledReorderResult,
  CollectionSnapshot,
  NoopReorderResult,
  OnReorder,
  RejectedReorderResolution,
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
 * A **runtime** export as well as a type (contract 03 §The export topology this
 * requires). The documented consumer calls `ReorderResolution.accept(…)` and
 * `.reject(…)`, so listing it under types only would make every example in the
 * contract fail to run.
 */
export { ReorderResolution } from './sortable/domain.ts';

/**
 * Composes one sortable behavior **and returns its controller** (D-48).
 *
 * ```ts
 * const list = sortable(root, { items, onReorder, axis: y() }, landing());
 * ```
 *
 * **The second argument is a complete `SortableConfig`, and every later one is
 * `Partial`** (D-77). Required configuration is a **type** obligation: a
 * missing `items`, `onReorder` or `axis` is a compile error rather than a
 * construction-time `TypeError`, which is why the assembler no longer checks
 * for one. `y()` and `xy()` return the installer itself, so an axis is written
 * `axis: y()` in that first argument rather than passed as a fragment — the
 * wrapper existed only to give a required slot a fragment position.
 *
 * **What a later fragment cannot do is clear a required slot**: the merge skips
 * `undefined`, so `{ axis: undefined }` in a `Partial` leaves the merged slot
 * as the first argument set it. That was a nicety while three construction
 * throws stood behind it and is the only remaining guard now.
 *
 * ~~`sortable(root, y(), callbacks({ onReorder }))`~~ — the example said that
 * until Revision 2 closure, and `callbacks()` was deleted by D-56. What a
 * consumer writes now is one config object for its own slots and a fragment per
 * capability that installs something.
 *
 * ~~`draggable(root, sortable(items, …))`~~ — the two-call form is withdrawn.
 * `sortable()` takes the ingress root itself and forwards it, so the ordinary
 * consumer never names `draggable`, never holds an opaque `Behavior`, and never
 * has to know a kernel tier exists. Authoring a *new* behavior is what
 * `@ydinjs/drag/kernel` is for.
 *
 * The features are **assembled once**, when `draggable()` installs the behavior
 * and a realm exists — and then dropped. Nothing retains the feature array or
 * the contribution objects afterwards: only the flat slot record and the
 * closures it holds survive, which is what keeps a feature's private state
 * unreachable from the behavior, the kernel, or a sibling feature.
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
