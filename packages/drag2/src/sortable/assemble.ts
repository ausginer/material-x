/**
 * Construction-time assembly: takes a merged config and returns one
 * `SortableSlots` in flat form.
 *
 * The contribution objects are dropped. After `assemble()` returns, only the
 * slot fields and the closures they hold exist. The contribution objects and
 * every reference to them are garbage. So the behavior, the kernel and sibling
 * features cannot reach a feature's private state.
 *
 * There is no single-writer arbitration. Each unique slot is produced by one
 * config key and read directly from that key's contribution. So there is no
 * accumulator to collide, no label to name in a diagnostic and no
 * `duplicate-contribution` identity. The keys are visited in schema order.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { LandingTiming } from '../shared/composition.ts';
import type { SortableConfig } from './config.ts';
import type { FeatureContext, SortableFeatureContext } from './feature.ts';
import type { DisplacementSettle } from './rect-index.ts';
import {
  DEFAULT_THRESHOLD,
  type DisplacementReport,
  NOOP_START,
  type SortableSlots,
} from './slots.ts';

export function assemble(
  config: SortableConfig,
  context: FeatureContext,
): SortableSlots {
  let landingTiming: LandingTiming | null = null;
  let report: DisplacementReport | null = null;
  let settle: DisplacementSettle | null = null;
  const retireHooks: Disposer[] = [];

  // There are no required-slot checks. The required first argument guarantees
  // the slots: `items`, `onReorder` and `axis` are compile errors when absent,
  // so runtime bytes that repeat this would add nothing.
  //
  // A JS consumer that omits a slot gets a different result per slot, and only
  // one of the three is classified. `onReorder` is the only one reached inside
  // a call into behavior code, so it is the only one that becomes a library
  // failure: `FAILURE_RESOLUTION`. `axis` fails below: at the key's own call
  // when it is absent, and at the flat slot record's dereference when it is a
  // function that returns no geometry. `items` fails earlier, at the
  // construction-time pull in `behavior.ts`. These three failures are the
  // consumer's own native `TypeError` from the consumer's own `sortable()`
  // call, with no stage, no `DraggableError` and no `onError`. Only a later
  // throw from a valid `items`, one that is a function and throws during an
  // `invalidate()`, reaches `FAILURE_ACTION_PREPARE`.
  //
  // The library is the only producer of a context, so this is the only place
  // that stamps the brand. `as` emits nothing: every call below is
  // `install(context)`.
  const branded = context as SortableFeatureContext;

  try {
    // Installation order is schema order, written out and not driven by a loop
    // over a heterogeneous array: the named capability keys, in the order the
    // schema declares them. Every reader of `retireHooks` walks it backwards.
    // With no unbounded position, no fragment order has to be preserved
    // anywhere.
    const axis = config.axis(branded);

    // Record cleanup first, before anything below can throw, and in
    // installation order. The axis feature's hook is first in installation
    // order and therefore last after the reverse walk, which is the documented
    // order for `[y(), …]`.
    //
    // Guarded, although the type declares `insertion` required. A JS-authored
    // installer that returns none must not fail here, where rollback has
    // nothing recorded yet and the later installers have not run. It fails at
    // the record's dereference below, inside the same `try`, with everything
    // that installed already retired.
    if (axis.insertion) {
      retireHooks.push(axis.insertion.retire);
    }

    if (axis.retire) {
      retireHooks.push(axis.retire);
    }

    if (config.landing) {
      const landing = config.landing(branded);

      if (landing.retire) {
        retireHooks.push(landing.retire);
      }

      ({ landingTiming } = landing);
    }

    if (config.displacement) {
      const displacement = config.displacement(branded);

      if (displacement.retire) {
        retireHooks.push(displacement.retire);
      }

      ({ report, settle } = displacement);
    }

    // Build the flat slot record inside the `try`, and keep it there. There is
    // no explicit `the axis installer contributed no insertion geometry` throw:
    // `AxisContribution` declares `insertion` required, so an installer that
    // returns none is not assignable, and a JS-authored violator is still
    // diagnosed because dereferencing a missing resolver throws by itself. An
    // explicit check would supply a better message, not the failure.
    //
    // The location of the dereference matters. Building the record after the
    // `try` would trade a diagnostic string for a leak: the throw would escape
    // while every installer that already ran still held its private state.
    // Asserting only that the call throws passes against that defect, so the
    // test also asserts the retirement.
    const slots: SortableSlots = {
      // This dereference stands in for a check. `insertion` is present for
      // every installer the type admits. The assertion makes a JS-authored
      // violator throw here, inside the `try`.
      resolveInsertion: axis.insertion.resolve,
      invalidateInsertion: axis.insertion.invalidate,
      movedInsertion: axis.insertion.moved,

      // Not validated as a function. The type says `ItemSource`. A JS consumer
      // that passes something else has already broken its own code at the
      // construction-time pull, before this record exists.
      items: config.items,
      onReorder: config.onReorder,
      // Two normalization rules, because "optional callback" is not one thing.
      // `onStart` becomes a shared module-level no-op, so its call site needs
      // no null check and allocates nothing. The terminal callbacks stay
      // nullable, because their arguments are result objects that would
      // otherwise be constructed only to be discarded.
      onStart: config.onStart ?? NOOP_START,
      onEnd: config.onEnd ?? null,
      onError: config.onError ?? null,
      // Not domain-checked, but defaulted. A `NaN` threshold makes the travel
      // test permanently false, so the drag never activates and no operation
      // starts. That breaks the consumer's own drag and moves no library
      // invariant. The default is applied on this line and not by the merge:
      // `mergeFragments` applies no defaults, because its output is still the
      // schema type, and normalization produces the flat record.
      threshold: config.threshold ?? DEFAULT_THRESHOLD,

      // The consumer's factory or the library's own `<div>`. No contributed
      // placeholder can compete for precedence, and there is no adapter
      // closure: the slot's type is the consumer's own `PlaceholderFactory`, so
      // this stores the function the consumer wrote.
      placeholder: config.placeholder ?? null,
      handle: config.handle ?? null,
      visual: config.visual ?? null,
      // `box(item) = visual(item)` by default, applied here so that no
      // downstream reader has to know the rule. Falling through to `null` when
      // neither is written keeps the minimal composition free of an identity
      // call per candidate per rebuild.
      box: config.box ?? config.visual ?? null,
      landingTiming,

      report,
      settle,
      retireHooks,
    };

    // Stored in installation order and walked backwards by every reader. The
    // published guarantee is about execution order. A `reverse()` here would be
    // a second representation of that order, with a mutation between the two.
    return slots;
  } catch (error) {
    // A later installer or the resolver dereference must not leak an earlier
    // feature's state. Installers have no external effects, so this concerns
    // retention and diagnostics and not a DOM leak. Rollback is stated as
    // total, so it runs every recorded hook.
    //
    // Rollback is total across construction, not only here. The collection is
    // pulled and copied before the first installer runs, not after this
    // function returns. If it were pulled after, a throwing `items()` would
    // leave every hook below unrun, and that statement would be false for the
    // call that drives this function. So this comment needs no scope clause.
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
