/**
 * Public entrypoint for the sortable behavior.
 *
 * `SortableFeature` is declared **here and re-exported nowhere else**, so the
 * shared type has one resolvable identity across the separate declaration files
 * rather than a structurally-equal duplicate per subpath. The remaining public
 * type surface is phase 9.
 */
import { draggable } from './kernel.ts';
import { createComposedSortableBehavior } from './sortable/behavior.ts';
import type { SortableConfig } from './sortable/config.ts';
import type { SortableController } from './sortable/controller.ts';

export type { SortableController } from './sortable/controller.ts';
/**
 * The config schema **and every alias it names** (D-45, F-51). A public type
 * that references an unexported one is a surface a consumer cannot fully write
 * down — they could fill the slot but never hoist the handler out of the object
 * literal — so the aliases ship with it. `tests/docs.node.test.ts` enforces the
 * closure rather than leaving it to review.
 */
export type {
  ItemSource,
  OnDragError,
  OnEnd,
  OnStart,
  ResolveElement,
  ResolveHandle,
  SortableConfig,
} from './sortable/config.ts';
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
  DragErrorContext,
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
 * const list = sortable(root, y(), callbacks({ onReorder }));
 * ```
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
  ...fragments: ReadonlyArray<Partial<SortableConfig>>
): SortableController {
  return draggable(root, createComposedSortableBehavior(fragments));
}
