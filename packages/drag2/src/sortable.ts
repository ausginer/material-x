/**
 * Public entrypoint for the sortable behavior: the ordinary tier.
 *
 * A consumer that composes a list reaches for this entry and `drag.js` and
 * nothing else: `sortable()` takes the root, calls `draggable()` internally and
 * returns its controller, so neither the kernel tier nor the installer tier is
 * on the ordinary path.
 *
 * `SortableConfig` and every alias it names are exported from here, resolved
 * within this tier and the tiers below it:
 * `sortable.js ∪ drag.js ∪ sortable/feature.js`. A config slot that a consumer
 * can fill but cannot move out of the object literal is not a writable surface.
 * The rule protects that ability to move the value: `AxisInstaller` ships from
 * here because `SortableConfig` names it. The names that `AxisInstaller`
 * reaches stay declared at `sortable/feature.js`, one import away for an author
 * who wants them.
 */
import { draggable } from './kernel.ts';
import { createComposedSortableBehavior } from './sortable/behavior.ts';
import type { SortableConfig } from './sortable/config.ts';
import type { SortableController } from './sortable/controller.ts';

export type { SortableController } from './sortable/controller.ts';
/**
 * The config schema and every alias it names. A public type that references an
 * unexported one is a surface a consumer cannot fully write down: they could
 * fill the slot but never move the handler out of the object literal. So the
 * aliases ship with the schema. `tests/docs.node.test.ts` enforces the closure
 * per entry, because the whole-run form cannot see this kind of hole in either
 * direction.
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
 * The installer slots' aliases, published here. `SortableConfig` names each
 * one: `axis` by `AxisInstaller`, `landing?` by `SortableLandingInstaller`,
 * `displacement?` by `SortableDisplacementInstaller`. So a consumer who writes
 * one can move it into a typed `const` and not only fill the slot inline. There
 * is one alias per key, because each key carries its own installer and
 * therefore its own contribution group. Their own closure (`FeatureContext`,
 * `AxisContribution`, `InsertionGeometry`) stays declared at
 * `sortable/feature.js`: this publishes the names, not the tier. Typing an
 * ordinary-tier config slot must never require importing the middle tier.
 */
export type {
  AxisInstaller,
  SortableDisplacementInstaller,
  SortableLandingInstaller,
} from './sortable/feature.ts';
/**
 * The cancellation stages, as values as well as a type, for the same reason as
 * `FailureStage` on `drag.js`: a `CanceledReorderResult` carries one and a
 * consumer has to be able to discriminate it.
 */
export {
  AT_CONSUMER,
  AT_PROPOSAL,
  type CancelStage,
} from './kernel/failures.ts';

/**
 * The cancellation origins, beside the stages and for the same reason. A
 * `CanceledReorderResult` carries one, and a consumer discriminates on this
 * field to tell "the user pressed Escape" from "the pointer was taken away"
 * from "something broke".
 *
 * Not on `drag.js`: `origin` is a field of a behavior-owned result, and its
 * sibling `stage` is already published here.
 */
export {
  CANCEL_ABORTED,
  CANCEL_FAILED,
  CANCEL_INTERRUPTED,
  CANCEL_SUPPLIED,
  type CancelOrigin,
} from './kernel/failures.ts';

/**
 * The reasons that the behavior itself supplies, as values. Each arrives on
 * `reason` with `origin: CANCEL_SUPPLIED`, because a behavior calling
 * `kernel.requestCancel` supplies a value exactly as a consumer does: the
 * sortable chose to say `sortable:item-removed`, and `SUPPLIED` means that.
 *
 * These belong here because this is domain vocabulary that the behavior owns,
 * published beside the result type that carries it. A consumer who compares
 * `reason` to one of these asks what was said, not who said it.
 */
export {
  CANCEL_COLLECTION_INVALIDATED,
  CANCEL_ITEM_REMOVED,
} from './sortable/domain.ts';
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
 * A runtime export as well as a type: the documented consumer calls
 * `ReorderResolution.accept(…)` and `.reject(…)`, so listing it under types
 * only would make every documented example fail to run.
 */
export { ReorderResolution } from './sortable/domain.ts';

/**
 * Composes one sortable behavior and returns its controller. It takes the root
 * element itself, so an ordinary consumer never names the kernel tier.
 *
 * ```ts
 * const list = sortable(root, { items, onReorder, axis: y() }, landing());
 * ```
 *
 * The second argument is a complete `SortableConfig`, and every later one is
 * `Partial`. Required configuration is a type obligation: a missing `items`,
 * `onReorder` or `axis` is a compile error and not a construction-time
 * `TypeError`. `y()` and `xy()` return the installer itself, so write an axis
 * as `axis: y()` in the complete config and do not pass it as a fragment.
 *
 * A later fragment cannot clear a required slot: the merge skips `undefined`,
 * so `{ axis: undefined }` in a `Partial` leaves the merged slot as the
 * complete config set it.
 *
 * Every slot is a named key with one writer, so no positional composition check
 * applies: two producers of a capability are unrepresentable.
 *
 * The installers run once, when the behavior is installed and a realm exists.
 * Their contributions are then dropped. Nothing retains a contribution object
 * afterwards: only the flat slot record and the closures it holds survive. So
 * the behavior, the kernel and sibling features cannot reach a feature's
 * private state.
 *
 * The set of installed features is immutable for the controller's life. A
 * feature that wants live policy updates has to be given a controller method by
 * the behavior. A feature cannot contribute one.
 */
export function sortable(
  root: HTMLElement,
  config: SortableConfig,
  ...fragments: ReadonlyArray<Partial<SortableConfig>>
): SortableController {
  return draggable(root, createComposedSortableBehavior(config, fragments));
}
