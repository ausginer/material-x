/**
 * The behavior instance: the one place `rt` is declared and created.
 *
 * ```ts
 * const rt = createSortableRuntime(host, items, slots);
 * return { spec: createSortableSpec(rt), controller: createSortableController(host, rt) };
 * ```
 *
 * Both halves are returned at once, which is what makes "no input can be
 * admitted before install returns" unexpressible rather than a rule (D-1).
 *
 * Assembly happens **inside** the install function, not before it: a feature
 * factory is handed `realm` and `root`, and neither exists until the kernel has
 * a host. The public `sortable(items, ...features)` entry lives in `sortable.ts`
 * and is the only caller that assembles.
 */
import { report } from '../kernel/reporter.ts';
import type {
  BehaviorFactory,
  BehaviorInstall,
  KernelHost,
} from '../kernel/spec.ts';
import { assemble } from './assemble.ts';
import { copyItems } from './collection.ts';
import { mergeFragments, type SortableConfig } from './config.ts';
import {
  createSortableController,
  type SortableController,
} from './controller.ts';
import type { SortableFramePart } from './frames.ts';
import { createSortableRuntime } from './runtime.ts';
import type { SortableSlots } from './slots.ts';
import { createSortableSpec } from './spec.ts';

/**
 * `source` is the array the pull returned and `items` is the library's own copy
 * of it (D-80 (b)). They are separate parameters because they are separate
 * facts:
 * `source` is the **identity baseline** a later pull is compared against
 * (D-44), so it must be the consumer's own array, while `items` is what the
 * behavior publishes and must be a copy no consumer can mutate.
 */
function install(
  host: KernelHost,
  source: readonly HTMLElement[],
  items: readonly HTMLElement[],
  slots: SortableSlots,
): BehaviorInstall<SortableController, SortableFramePart, HTMLElement> {
  const rt = createSortableRuntime(host, source, items, slots);

  return {
    spec: createSortableSpec(rt),
    controller: createSortableController(host),
  };
}

/**
 * Takes an already-assembled slot record.
 *
 * **An internal test seam, and what it protects is the wiring** (D-126). It is
 * not a construction layer and not a duplicate of the composed path: both
 * factories delegate to the same module-private `install()`, so the browser
 * suite composes runtime, spec and controller exactly as production does
 * rather than beside it, where a test-local equivalent could drift. What it
 * adds is reach — an already-flattened `SortableSlots` carrying states the
 * public config cannot express, such as a stub resolver, no placeholder
 * factory, or the hook overrides no `SortableConfig` names. It cannot become
 * public surface: its parameter type is the one `feature.ts` deliberately
 * stops the published closure at.
 *
 * **A plain factory, unbranded** (D-55). `brandBehavior` is withdrawn: with
 * `sortable()` returning its controller directly there is no branded value for
 * a consumer to hold, so the brand had no producer.
 */
export function createSortableBehavior(
  items: readonly HTMLElement[],
  slots: SortableSlots,
): BehaviorFactory<SortableController, SortableFramePart, HTMLElement> {
  // Copied here for the same reason as the composed path below (D-80 (b)): the
  // collection becomes the library's own at the boundary that receives it, so
  // the behavior never publishes a snapshot over an array the caller still
  // holds. **Both paths copy; neither validates any more** (D-121) — the
  // mirroring is what must not drift, and what is mirrored is now the
  // ownership act rather than a refusal.
  return (host) => install(host, items, copyItems(items), slots);
}

/**
 * Merges the fragments, then assembles against the host's realm and root.
 *
 * **Two stages, and the split is the decision** (D-45): the merge resolves
 * every named slot before a single installer runs, which is what makes
 * last-wins a merge rule rather than a lifecycle problem — a capability that
 * loses its slot is never constructed, so there is nothing to retire.
 *
 * The merge happens here rather than at the `sortable()` call site because
 * nothing before this point is per-controller: merging eagerly would compute a
 * config for a behavior that may never be installed.
 */
export function createComposedSortableBehavior(
  config: SortableConfig,
  fragments: ReadonlyArray<Partial<SortableConfig>>,
): BehaviorFactory<SortableController, SortableFramePart, HTMLElement> {
  const merged = mergeFragments(config, fragments);

  return (host) => {
    // **D-44: the first pull.** Every later one goes through
    // `action.prepare(COLLECTION)`; this is the initial snapshot and the
    // initial structural baseline, and it is the only `items()` call that
    // happens outside a transaction.
    //
    // **Called unguarded** (D-77). The `typeof` test that used to stand here
    // existed to route a non-function `items` to the assembler's diagnostic,
    // and that diagnostic is deleted: a non-callable `items` is a
    // required-config *type* violation, not a library invariant, so the
    // unavoidable construction call is left to fail naturally. Only a later
    // throw from a *valid* source — one that is a function and raises during an
    // `invalidate()` — belongs to `FAILURE_ACTION_PREPARE`.
    const source = merged.items();

    // **Pulled before the first installer runs, and the statement order is
    // normative** (D-80 (b), F-69, F-98). The motive is now F-69 alone: the
    // pull above is **consumer code** and may throw on its own, and it must not
    // do so with installer `retire` hooks recorded and unrun, because nothing
    // here is bracketed and `arm()` is never reached. F-68's window — a
    // duplicated element throwing from the copy, *after* `assemble` returned —
    // closed a second time when D-121 removed that refusal; the ordering it
    // motivated stays, on the reason that outlives it.
    //
    // **The pull and the assembly were sibling arguments to one call, and only
    // left-to-right evaluation made that safe** (F-69). Swapping them is a
    // change no reviewer would flag, and it would strand every hook. They are
    // statements so the ordering is deliberate rather than positional.
    const items = copyItems(source);

    return install(
      host,
      source,
      items,
      // `report`, not `fail`: a feature closure created here cannot know which
      // operation is live, so classifying a failure from one would let a late
      // continuation settle another.
      assemble(merged, { realm: host.realm, root: host.root, report }),
    );
  };
}
