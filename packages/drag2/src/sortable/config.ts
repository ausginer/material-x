// A fragment is a plain declarative partial config: every argument after `root`
// is an ordinary object literal carrying no brand, no `kind` tag and no
// provenance. **Every slot last-wins**, so the merge is one walk over the
// schema — there is no appending slot left since `plugins` was deleted with the
// bracket it existed for.
import type { Writable } from 'type-fest';
import type { DraggableError, DraggableWarning } from '../kernel/errors.ts';
import type { OnReorder, ReorderTransactionResult } from './domain.ts';
import type {
  AxisInstaller,
  SortableDisplacementInstaller,
  SortableLandingInstaller,
} from './feature.ts';

import type { PlaceholderFactory } from './placement.ts';

// Every callback slot is a named type alias, and that is normative rather than
// stylistic. Method shorthand is checked bivariantly even under `strict`, so a
// handler narrowed to a subset of a union's arms is silently accepted; and the
// inline property form does not survive this repo, because
// `@typescript-eslint/method-signature-style` is configured to `method` and
// `just lint-fix` rewrites it back into shorthand. A named alias is immune.
//
// `onStart`, `onEnd` and `onError` exist on both ordinary configs with
// different structures, so those three aliases are qualified by behavior.
// `ResolveHandle` and `ResolveElement` also collide but are structurally
// identical, so they stay unqualified.
export type SortableOnStart = (item: HTMLElement) => void;
/**
 * **A `DraggableWarning` means the operation was not affected** — a landing
 * measurement that could not be trusted, a disposer that refused — and its
 * terminal still arrives. A `DraggableError` means it was.
 */
export type SortableOnDragError = (
  error: DraggableError | DraggableWarning,
) => void;
/** **One terminal callback, four arms.** */
export type SortableOnEnd = (result: ReorderTransactionResult) => void;
export type ResolveHandle = (item: HTMLElement) => HTMLElement | null;
export type ResolveElement = (item: HTMLElement) => HTMLElement;
/**
 * The collection, pulled on demand.
 *
 * **Every element it returns must be distinct, and that is a definition rather
 * than a restriction.** The pair this API publishes is `{ from, to }`: `from`
 * indexes the collection you returned, `to` indexes the **destination view** —
 * the same collection minus the dragged element — and the two spaces differ by
 * exactly one *only while the dragged element occurs once*. Uniqueness is the
 * condition under which `{ from, to }` has a meaning at all, so a collection
 * naming one element twice has no reorder to describe.
 *
 * **Nothing detects a violation.** The realistic way to reach one is composing
 * this function from overlapping sources — a concatenation, a query that
 * matches a row twice, a virtualized window overlapping its buffer — so it is
 * worth checking at the point where the array is built. A duplicate produces
 * indices in two differently sized spaces, with no error and no cancellation:
 * applying the published pair puts the element somewhere it was not dropped,
 * and a duplicate elsewhere in the list can end a live operation against a
 * republication that changed nothing.
 *
 * Array **identity** is a separate signal and is not this term: returning an
 * equal-but-new array is what tells the library membership may have changed.
 */
export type ItemSource = () => readonly HTMLElement[];

/**
 * The public, stable schema. Every slot is optional in a *fragment*; the
 * required ones are required of the **merged** result.
 */
export type SortableConfig = Readonly<{
  /* required after the merge */
  /**
   * The collection, pulled on demand. **Every element it returns must be
   * distinct** — the condition under which the published `{ from, to }` pair
   * has a meaning. See {@link ItemSource}.
   */
  items: ItemSource;
  onReorder: OnReorder;
  // **Each installer key carries its own type.** A plugin-shaped installer is
  // not assignable here, and the assembler needs no check for one — nor any
  // arbitration, since no other key can produce `insertion`.
  /**
   * `y()` or `xy()`. An **atomic** capability slot: one installer, one whole.
   * The contribution it returns must carry `insertion`.
   */
  axis: AxisInstaller;

  /* optional consumer functions */
  onStart?: SortableOnStart;
  /** Exactly once per started operation, whatever happened to it. */
  onEnd?: SortableOnEnd;
  onError?: SortableOnDragError;
  handle?: ResolveHandle;
  /**
   * The node **faithfully lifted** — what the user sees travel.
   *
   * Defaults to the item.
   */
  visual?: ResolveElement;
  /**
   * The **geometry source**: the element whose footprint the placeholder stands
   * in for, and the element every insertion candidate is measured on.
   * `box(item) = visual(item)` by default, which is the common case and costs
   * it nothing.
   *
   * **Separate from `visual` because they answer different questions.** They
   * diverge when the lifted node is nested inside the element that actually
   * holds the space — a row that lifts its inner card, say. Sizing the
   * placeholder from the visual then runs the list too tall for an entire drag,
   * because the visual's own height is not the height its removal freed.
   *
   * **Scope limits, stated positively**: visual order must follow DOM order,
   * rule-placed layouts are unsupported, in grid `box` must equal `visual`,
   * and where `visual` resolves to a **descendant** of the item, no transform
   * may sit between the item and its visual. The last one is what displacement
   * needs: a displaced row's `translate` is projected through the ancestry
   * measured **at the visual**, so a transform in between is counted twice and
   * the row travels by the wrong factor. It is met by putting the transform on
   * the visual itself, which that ancestry excludes by construction, or above
   * the collection. Nothing detects a violation, so these are documented
   * boundaries rather than guards.
   */
  box?: ResolveElement;
  // The callback itself, not `createPlaceholder` plus a class name.
  /**
   * Changes which element the placeholder is; the behavior always creates one.
   * Must return a **detached** element that is neither the dragged item nor its
   * visual.
   *
   * Nothing detects a violation — the returned element is **adopted**:
   * activation inserts it, every move relocates it, and teardown removes it, so
   * returning an attached node hands the library ownership of something the
   * page owns and teardown then deletes it. A documented boundary, not a guard.
   */
  placeholder?: PlaceholderFactory;

  /* optional capabilities */
  landing?: SortableLandingInstaller;

  /**
   * The displacement feature — `layoutAnimation()`. **One writer**, because two
   * mechanisms writing additive `translate` on the same rows is a collision the
   * key's cardinality makes unrepresentable rather than detectable.
   */
  displacement?: SortableDisplacementInstaller;

  threshold?: number;
}>;

/**
 * The merge iterates the schema, not the fragment's own keys: copying whatever
 * a fragment happens to carry would put an unknown key into the config, where
 * nothing reads it and nothing complains, while walking a fixed list makes a
 * misspelled slot a diagnosable no-op.
 *
 * **Every slot is on it**, which it was not while `plugins` appended.
 */
const LAST_WINS_KEYS = [
  'items',
  'onReorder',
  'axis',
  'onStart',
  'onEnd',
  'onError',
  'handle',
  'visual',
  'box',
  'placeholder',
  'landing',
  'displacement',
  'threshold',
] as const satisfies ReadonlyArray<keyof SortableConfig>;

/**
 * Merge semantics belong to the config slot, not to fragment provenance: the
 * slot's kind decides and a fragment gets no say. Scalars and plain consumer
 * functions last-win, and an atomic capability installer last-wins as one whole
 * slot — which is now every slot there is.
 *
 * Last-wins is safe precisely because installers are invoked after the merge
 * completes. A capability that loses its slot is never constructed — no cache
 * is allocated, no entry appears in `retireHooks`, and there is nothing to
 * retire.
 */
export function mergeFragments(
  config: SortableConfig,
  fragments: ReadonlyArray<Partial<SortableConfig>>,
): SortableConfig {
  // Partial while it is being built, even though the first source is complete:
  // the walk is one loop over one schema, and starting from `{}` keeps the
  // required first argument and the optional fragments on the same code path
  // rather than buying a second one to save an assignment.
  const merged: Partial<Writable<SortableConfig>> = {};

  for (const fragment of [config, ...fragments]) {
    for (const key of LAST_WINS_KEYS) {
      const value = fragment[key];

      if (value !== undefined) {
        // The write is per-key and each key's type is its own; the schema list
        // is what makes it exhaustive, and the cast is confined to this line.
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }

  // Nothing checks the merged result: `sortable()` takes a complete
  // `SortableConfig` and only the later fragments are `Partial`, so `items`,
  // `onReorder` and `axis` were supplied at a call that could not compile
  // without them.
  //
  // The `undefined` skip above is load-bearing rather than a nicety. A later
  // fragment is a legal `Partial` value and may carry `axis: undefined`;
  // skipping it means a required slot the first argument filled cannot be
  // cleared by a fragment that names it and supplies nothing.
  return merged as SortableConfig;
}
