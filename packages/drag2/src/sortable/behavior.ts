/**
 * The behavior instance: the one place the spec and the controller are created.
 *
 * ```ts
 * return {
 *   spec: createSortableSpec(host, source, items, slots),
 *   controller: createSortableController(host),
 * };
 * ```
 *
 * Both halves are returned at once, which is what makes "no input can be
 * admitted before install returns" unexpressible rather than a rule (D-1).
 *
 * **Neither half is handed a runtime object** (D-149): what each takes is the
 * host, and the behavior's own state lives in the spec's closure, where nothing
 * outside can name it.
 *
 * Assembly happens **inside** the returned factory, not before it: a feature
 * factory is handed `realm` and `root`, and neither exists until the kernel has
 * a host. The public `sortable(items, ...features)` entry lives in `sortable.ts`
 * and is the only caller that assembles.
 *
 * **Two factories, and each returns the handshake itself.** There is no shared
 * `install` between them any more: it was a name for two constructor calls, and
 * naming those twice is cheaper than a function that exists to be called from
 * two places. What the seam below protects is unchanged and does not depend on
 * the indirection — both factories reach the **same two constructors** with the
 * same arguments, so the browser suite composes spec and controller exactly as
 * production does. The cost is named rather than absorbed: a third half of the
 * handshake would have to be written twice, and `BehaviorInstall` is the type
 * that would catch a factory that forgot one.
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
 * **An internal test seam, and what it protects is the wiring** (D-126). It is
 * not a construction layer and not a duplicate of the composed path: it calls
 * the same two constructors the composed factory does, so the browser suite
 * composes spec and controller exactly as production does rather than beside
 * it, where a test-local equivalent could drift. What it adds is reach — an already-flattened `SortableSlots` carrying states the
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
  //
  // **`source` and the copy are separate arguments because they are separate
  // facts** (D-44, D-80 (b)): `source` is the identity baseline a later pull is
  // compared against, so it must be the caller's own array, while the copy is
  // what the behavior publishes and no caller may mutate.
  return (host) => ({
    spec: createSortableSpec(host, items, [...items], slots),
    controller: createSortableController(host),
  });
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
    // **Called unguarded** (D-77). A `typeof` test here would route a
    // non-function `items` to an assembler diagnostic that does not exist: a
    // non-callable `items` is a required-config *type* violation, not a library
    // invariant, so the unavoidable construction call is left to fail
    // naturally. Only a later
    // throw from a *valid* source — one that is a function and raises during an
    // `invalidate()` — belongs to `FAILURE_ACTION_PREPARE`.
    const source = merged.items();

    // **Pulled before the first installer runs, and the statement order is
    // normative** (D-80 (b), F-69, F-98). The motive is F-69: the pull above is
    // **consumer code** and may throw on its own, and it must not do so with
    // installer `retire` hooks recorded and unrun, because nothing here is
    // bracketed and `arm()` is never reached. That reason holds on its own —
    // a duplicated element throwing from the copy after `assemble` returns is
    // no longer a case at all (D-121), and the ordering does not depend on it.
    //
    // **The pull and the assembly are separate statements, and that is what
    // makes the order safe** (F-69). As sibling arguments to one call it would
    // rest on left-to-right evaluation instead: swapping them is a change no
    // reviewer would flag, and it would strand every hook.
    const items = [...source];

    return {
      spec: createSortableSpec(
        host,
        source,
        items,
        assemble(merged, {
          realm: host.realm,
          root: host.root,
          // **The composition unwind's only route to the channel** (D-130 §1).
          // `assemble` runs before `arm()`, so no behavior spec exists yet and the
          // kernel's own notifier is unreachable — but `merged.onError` is in hand
          // right here, which makes this the smallest threading available rather
          // than a new ownership path.
          //
          // `report`, not `fail`: a feature closure created here cannot know which
          // operation is live, so classifying a failure from one would let a late
          // continuation settle another.
          report: (error) => {
            if (host.closed) {
              return;
            }

            try {
              merged.onError?.(
                new DraggableWarning('drag: composition/unwind-failed', error),
              );
            } catch {
              // The terminus. A construction unwind that cannot report is still an
              // unwind, and its next step matters more than this notification.
            }
          },
        }),
      ),
      controller: createSortableController(host),
    };
  };
}
