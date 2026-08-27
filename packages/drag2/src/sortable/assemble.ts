/**
 * Construction-time assembly: a list of features in, one `SortableSlots` in
 * flat form out (contract 03 §Assembly).
 *
 * **The contribution objects are dropped.** After `assemble()` returns, the only
 * things that exist are the slot fields and the closures they hold — the feature
 * array, the contribution objects and every reference to either are garbage.
 * That is what makes the private feature state in contract 03 §Private feature
 * state unreachable from the behavior, the kernel, or a sibling feature.
 *
 * **No single-writer arbitration** (D-146). Each unique slot is produced by one
 * config key and read from that key's contribution directly, so there is no
 * accumulator to collide, no label to name in a diagnostic and no
 * `duplicate-contribution` identity. The keys are visited in schema order, which
 * is what `claim`'s loop was also doing.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { LandingStart } from '../kernel/spec.ts';
import type { SortableConfig } from './config.ts';
import type { FeatureContext, SortableFeatureContext } from './feature.ts';
import {
  DEFAULT_THRESHOLD,
  type DisplacementHook,
  NOOP_START,
  type SortableSlots,
} from './slots.ts';

export function assemble(
  config: SortableConfig,
  context: FeatureContext,
): SortableSlots {
  let startLanding: LandingStart | null = null;
  const beforeMove: DisplacementHook[] = [];
  const afterMove: DisplacementHook[] = [];
  const retireHooks: Disposer[] = [];

  // **The three required-slot checks are deleted** (D-77). They were the
  // package's answer to a slot the merge could not guarantee, and the required
  // first argument guarantees it instead: `items`, `onReorder` and `axis` are
  // compile errors when absent, so paying runtime bytes to restate that is
  // exactly the byte `CODE_OF_SIZE.md` §1.3 refuses.
  //
  // **What a JS consumer meets instead is per slot, and only one of the three
  // is classified.** `onReorder` is the only one reached inside a seam, so it
  // is the only one that becomes a library failure — `FAILURE_RESOLUTION`.
  // `axis` fails below — at the key's own call when it is absent, and at the
  // flat slot record's dereference when it is a function that returns no
  // geometry — and `items` fails earlier still, at the construction-time pull
  // in `behavior.ts`: all three are the consumer's own native `TypeError` out
  // of their own `sortable()` call, with no stage, no `DraggableError` and no
  // `onError`. Only a later throw from a **valid** `items` —
  // one that is a function and raises during an `invalidate()` — reaches
  // `FAILURE_ACTION_PREPARE`.
  //
  // The library is the only producer of a context, so it is the only place the
  // brand is stamped. `as` emits nothing: every call below is `install(context)`
  // (D-138).
  const branded = context as SortableFeatureContext;

  try {
    // **Installation order is schema order** (D-57), and since D-146 it is
    // written out rather than driven by a loop over a heterogeneous array:
    // named capability keys first, in the order the schema declares them, then
    // plugins in array order; `retireHooks` reverses the whole sequence.
    // Fragment order survives only inside `plugins`, and recovering a
    // first-appearance order would mean recording which fragment each slot
    // arrived from — exactly the provenance D-45 deleted.
    const axis = config.axis(branded);

    // Cleanup is recorded **first**, before anything below can throw, and in
    // installation order. Recording it after the loop would put the axis
    // feature's hook last in installation order and therefore *first* after the
    // reverse, which is the opposite of the documented order for `[y(), …]`.
    //
    // Guarded, though the type declares `insertion` required: a JS-authored
    // installer that returns none must not fail *here*, where the unwind has
    // nothing recorded yet and the plugins have not run. It fails at the
    // record's dereference below, inside the same bracket, with everything that
    // installed already retired.
    if (axis.insertion) {
      retireHooks.push(axis.insertion.retire);
    }

    if (axis.retire) {
      retireHooks.push(axis.retire);
    }

    if (axis.beforeInsertionMove) {
      beforeMove.push(axis.beforeInsertionMove);
    }

    if (axis.afterInsertionMove) {
      afterMove.push(axis.afterInsertionMove);
    }

    if (config.landing) {
      const landing = config.landing(branded);

      if (landing.retire) {
        retireHooks.push(landing.retire);
      }

      ({ startLanding } = landing);
    }

    for (const install of config.plugins ?? []) {
      const plugin = install(branded);

      if (plugin.retire) {
        retireHooks.push(plugin.retire);
      }

      if (plugin.beforeInsertionMove) {
        beforeMove.push(plugin.beforeInsertionMove);
      }

      if (plugin.afterInsertionMove) {
        afterMove.push(plugin.afterInsertionMove);
      }
    }

    // **The flat slot record is built inside the unwind bracket, and that
    // placement is normative** (D-77, 03 §Assembly). The explicit
    // `the axis installer contributed no insertion geometry` throw is deleted:
    // `AxisContribution` declares `insertion` required, so a plugin-shaped
    // installer is not assignable, and a JS-authored violator is still
    // diagnosed — dereferencing a missing resolver throws by itself. What the
    // deleted check supplied was a better message, not the failure.
    //
    // **Where the dereference happens is the part that had to survive the
    // deletion.** Building the record after the bracket would trade a
    // diagnostic string for a leak: the throw would escape with every
    // installer that already ran still holding its private state, which is
    // precisely what the explicit check's placement prevented. Asserting only
    // that it throws passes against that defect, so the test asserts the
    // retirement too.
    const slots: SortableSlots = {
      // The dereference that replaced the check. `insertion` is present for
      // every installer the type admits; the assertion is what makes a
      // JS-authored violator throw *here*, inside the bracket.
      resolveInsertion: axis.insertion.resolve,
      invalidateInsertion: axis.insertion.invalidate,
      // Flattened like the other two, and normalized to `null` rather than to a
      // no-op: the behavior's call site is already inside a guarded branch, so a
      // null check costs nothing there and a shared no-op would hide from a
      // reader that the eager read is optional.
      measureInsertion: axis.insertion.measure ?? null,

      // **Not validated as a function** (D-77). The type says `ItemSource`; a
      // JS consumer that passes something else has already broken its own code
      // at the construction-time pull, before this record exists.
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
      // **The domain check is deleted, the default is not** (D-77). A `NaN`
      // threshold makes the travel test permanently false, so the drag never
      // activates and **no operation starts** — the consumer's own drag is
      // broken and no library invariant moves. The **default** is applied
      // here, on this line, and not by the merge (P18A-02): `mergeFragments`
      // applies no defaults at all, because its output is still the schema type
      // while normalization is what produces the flat record.
      threshold: config.threshold ?? DEFAULT_THRESHOLD,

      // **The consumer's factory or the library's own `<div>`** (D-146). There
      // is no contributed placeholder to lose a precedence question to, and no
      // adapter closure: the slot's type is the consumer's own
      // `PlaceholderFactory`, so what is stored here is the function the
      // consumer wrote.
      placeholder: config.placeholder ?? null,
      handle: config.handle ?? null,
      visual: config.visual ?? null,
      // **`box(item) = visual(item)` by default** (D-43), applied here so no
      // downstream reader has to know the rule. Falling through to `null` when
      // neither is written keeps the minimal composition free of an identity
      // call per candidate per rebuild.
      box: config.box ?? config.visual ?? null,
      startLanding,

      beforeMove,
      afterMove,
      retireHooks,
    };

    // Reversed exactly once, and **after** the record is built rather than
    // before: the record holds this very array, so the reverse still reaches
    // it — while the unwind above, which walks backwards, keeps seeing
    // installation order for as long as anything can still throw.
    retireHooks.reverse();

    return slots;
  } catch (error) {
    // A later installer or the resolver dereference must not leak an earlier
    // feature's state. Factories are externally inert, so this
    // is a retention and diagnostics concern rather than a DOM leak — but the
    // unwind is stated as total, so it is total.
    //
    // **Total across construction, not merely here** (D-80 (b), F-69). The
    // collection is pulled and copied ahead of the first installer rather than
    // after this function returns; were it pulled after, a throwing `items()`
    // would leave every hook below unrun and that sentence would be false of
    // the call that drives this one. That is why this needs no scope clause.
    for (let i = retireHooks.length - 1; i >= 0; i -= 1) {
      try {
        retireHooks[i]!();
      } catch (nested) {
        context.report(nested);
      }
    }

    throw error;
  }
}
