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

  // **The three required-slot checks are deleted** (D-77). They were the
  // package's answer to a slot the merge could not guarantee, and the required
  // first argument guarantees it instead: `items`, `onReorder` and `axis` are
  // compile errors when absent, so paying runtime bytes to restate that is
  // exactly the byte `CODE_OF_SIZE.md` §1.3 refuses.
  //
  // **What a JS consumer meets instead is per slot, and only one of the three
  // is classified.** `onReorder` is the only one reached inside a seam, so it
  // is the only one that becomes a library failure — `FAILURE_RESOLUTION` →
  // `consumer`. `axis` fails below, at the flat slot record's dereference of a
  // resolver that is not there, and `items` fails earlier still, at the
  // construction-time pull in `behavior.ts`: both are the consumer's own native
  // `TypeError` out of their own `sortable()` call, with no classification, no
  // coarse code and no `onError`. Only a later throw from a **valid** `items` —
  // one that is a function and raises during an `invalidate()` — reaches
  // `FAILURE_ACTION_PREPARE`.
  //
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

    // **The flat slot record is built inside the unwind bracket, and that
    // placement is normative** (D-77, 03 §Assembly). The explicit
    // `the axis installer contributed no insertion geometry` throw is deleted:
    // `AxisInstaller` declares `insertion` required, so a plugin-shaped
    // installer is not assignable, and a JS-authored violator is still
    // diagnosed — dereferencing a null resolver throws by itself. What the
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
      // The dereference that replaced the check. `insertion` is non-null for
      // every installer the type admits; the assertion is what makes a
      // JS-authored violator throw *here*, inside the bracket.
      resolveInsertion: insertion!.resolve,
      invalidateInsertion: insertion!.invalidate,
      // Flattened like the other two, and normalized to `null` rather than to a
      // no-op: the behavior's call site is already inside a guarded branch, so a
      // null check costs nothing there and a shared no-op would hide from a
      // reader that the eager read is optional.
      measureInsertion: insertion!.measure ?? null,

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
      // broken and no library invariant moves. ~~It used to live in
      // `callbacks()`, then in the merge~~ — and the **default** is applied
      // here, on this line, not by the merge either (P18A-02): `mergeFragments`
      // applies no defaults at all, because its output is still the schema type
      // while normalization is what produces the flat record.
      threshold: config.threshold ?? DEFAULT_THRESHOLD,

      // **The config slot wins over a contributed one** (D-65). A consumer
      // writing `placeholder` is being explicit about the element; an installer
      // that also names the slot is providing a default for compositions that
      // do not.
      createPlaceholder: config.placeholder
        ? (placeholderContext) => config.placeholder!(placeholderContext)
        : contributedPlaceholder,
      getHandle: config.handle ?? null,
      getVisual: config.visual ?? null,
      // **`box(item) = visual(item)` by default** (D-43), applied here so no
      // downstream reader has to know the rule. Falling through to `null` when
      // neither is written keeps the minimal composition free of an identity
      // call per candidate per rebuild.
      getBox: config.box ?? config.visual ?? null,
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
    // A later factory, a claim collision or the resolver dereference must not
    // leak an earlier feature's state. Factories are externally inert, so this
    // is a retention and diagnostics concern rather than a DOM leak — but the
    // unwind is stated as total, so it is total.
    //
    // **Total across construction, not merely here** (D-80 (b), F-68). The
    // sentence used to be true of this function and false of the call that
    // drives it: `copyUniqueItems` ran inside `install`, after this returned,
    // so a duplicated element left every hook below unrun. The pull is
    // validated ahead of the first installer now, which is why this needs no
    // scope clause.
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
