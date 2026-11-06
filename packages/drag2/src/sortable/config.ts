// A fragment is a plain declarative partial config: every argument after `root`
// is an ordinary object literal with no brand, no `kind` tag and no provenance.
// Every slot is last-wins, so the merge is one walk over the schema.
import type { Writable } from 'type-fest';
import type { DraggableError, DraggableWarning } from '../kernel/errors.ts';
import type { OnReorder, ReorderTransactionResult } from './domain.ts';
import type {
  AxisInstaller,
  SortableDisplacementInstaller,
  SortableLandingInstaller,
} from './feature.ts';

import type { PlaceholderFactory } from './placement.ts';

// Every callback slot must be a named type alias. Method shorthand is checked
// bivariantly even under `strict`, so TypeScript silently accepts a handler
// narrowed to a subset of a union's members. The inline property form does not
// work in this repo, because `@typescript-eslint/method-signature-style` is set
// to `method` and `just lint-fix` rewrites that form into shorthand. A named
// alias avoids both problems.
//
// `onStart`, `onEnd` and `onError` exist on both ordinary configs with
// different structures, so the names of those three aliases include the
// behavior. `ResolveHandle` and `ResolveElement` also collide but are
// structurally identical, so their names do not.
export type SortableOnStart = (item: HTMLElement) => void;
/**
 * A `DraggableWarning` means that this fault did not decide the outcome.
 * Examples are a landing measurement that could not be trusted, a disposer that
 * refused, and a throw that a cancel or destruction had already superseded. The
 * operation ends as it would have ended without the fault. So do not wait on a
 * warning for a terminal callback: the terminal callback may already have
 * arrived, and destruction publishes none. A `DraggableError` means that the
 * fault changed the outcome.
 */
export type SortableOnDragError = (
  error: DraggableError | DraggableWarning,
) => void;
/**
 * Receives one of four terminal results. This is the only terminal callback.
 */
export type SortableOnEnd = (result: ReorderTransactionResult) => void;
export type ResolveHandle = (item: HTMLElement) => HTMLElement | null;
export type ResolveElement = (item: HTMLElement) => HTMLElement;
/**
 * Returns the collection. The library calls this function on demand.
 *
 * Every element returned must be distinct. The published pair is
 * `{ from, to }`. `from` is an index into the collection you returned. `to` is
 * an index into the destination view: the same collection without the dragged
 * element. The two index spaces differ by exactly one only while the dragged
 * element occurs once. So `{ from, to }` has a meaning only for a collection of
 * unique elements, and a collection that names one element twice has no reorder
 * to describe.
 *
 * Nothing detects a violation. A realistic cause is building this function from
 * overlapping sources: a concatenation, a query that matches a row twice, or a
 * virtualized window that overlaps its buffer. So it is worth checking at the
 * point where the array is built. A duplicate produces indices in two
 * differently sized spaces, with no error and no cancellation. Applying the
 * published pair then puts the element somewhere it was not dropped. A
 * duplicate elsewhere in the list can end a live operation against a
 * republication that changed nothing.
 *
 * Array identity is a separate signal and is not part of this requirement:
 * returning an equal but new array tells the library that membership may have
 * changed.
 */
export type ItemSource = () => readonly HTMLElement[];

/**
 * The public, stable schema. Every slot is optional in a fragment. The required
 * slots are required in the merged result.
 */
export type SortableConfig = Readonly<{
  /* required after the merge */
  /**
   * The collection, read on demand. Every element returned must be distinct,
   * because the published `{ from, to }` pair has a meaning only under that
   * condition. See {@link ItemSource}.
   */
  items: ItemSource;
  onReorder: OnReorder;
  // Each installer key has its own type. An installer that returns no
  // `insertion` is not assignable here, so the assembler needs no check for
  // one. The assembler also needs no arbitration, because no other key can
  // produce `insertion`.
  /**
   * `y()` or `xy()`. This slot holds one installer as one whole. The
   * contribution that the installer returns must carry `insertion`.
   */
  axis: AxisInstaller;

  /* optional consumer functions */
  onStart?: SortableOnStart;
  /**
   * Called exactly once per started operation, whatever happened to that
   * operation.
   */
  onEnd?: SortableOnEnd;
  onError?: SortableOnDragError;
  handle?: ResolveHandle;
  /**
   * The node that is faithfully lifted: what the user sees travel.
   *
   * Defaults to the item. It is expected to resolve to the item or to something
   * inside the item. Nothing detects a violation: an unrelated element measures
   * correctly and lifts, but the placeholder then stands in for a footprint the
   * collection never had.
   */
  visual?: ResolveElement;
  /**
   * The geometry source: the element whose footprint the placeholder stands in
   * for, and the element that every insertion candidate is measured on. By
   * default `box(item) = visual(item)`. That is the common case, and it adds no
   * cost to that case.
   *
   * `box` is separate from `visual` because they answer different questions.
   * They differ when the lifted node is nested inside the element that actually
   * holds the space, for example a row that lifts its inner card. Sizing the
   * placeholder from the visual then makes the list too tall for the entire
   * drag, because the visual's own height is not the height that its removal
   * freed.
   *
   * Scope limits: visual order must follow DOM order, rule-placed layouts are
   * unsupported, and in grid `box` must equal `visual`. Nothing detects a
   * violation.
   */
  box?: ResolveElement;
  /**
   * Changes which element the placeholder is. The behavior always creates a
   * placeholder. Must return a detached element that is neither the dragged
   * item nor its visual.
   *
   * Nothing detects a violation. The library adopts the returned element:
   * activation inserts it, every move relocates it, and teardown removes it. So
   * if you return an attached node, the library takes ownership of a node that
   * the page owns, and teardown deletes it.
   */
  placeholder?: PlaceholderFactory;

  /* optional capabilities */
  landing?: SortableLandingInstaller;

  /**
   * The displacement feature: `layoutAnimation()`. This slot holds one writer,
   * because two mechanisms writing additive `translate` on the same rows would
   * collide. The slot accepts one installer, so that collision cannot be
   * expressed and nothing has to detect it.
   */
  displacement?: SortableDisplacementInstaller;

  threshold?: number;
}>;

/**
 * The merge iterates this schema list, not the fragment's own keys. Copying
 * whatever a fragment carries would put an unknown key into the config, where
 * nothing reads it and nothing complains. A fixed list makes a misspelled slot
 * a diagnosable no-op.
 *
 * Every slot is on this list.
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
 * Merge rules belong to the config slot, not to the fragment's provenance: the
 * slot's kind decides, and a fragment has no say. Scalars and plain consumer
 * functions are last-wins. An atomic capability installer is last-wins as one
 * whole slot. These rules cover every slot.
 *
 * Last-wins is safe because installers run after the merge completes. A
 * capability that loses its slot is never constructed: no cache is allocated,
 * no entry appears in `retireHooks`, and there is nothing to retire.
 */
export function mergeFragments(
  config: SortableConfig,
  fragments: ReadonlyArray<Partial<SortableConfig>>,
): SortableConfig {
  // Partial while being built, even though the first source is complete. The
  // walk is one loop over one schema. Starting from `{}` keeps the required
  // first argument and the optional fragments on the same code path. A second
  // path would only save an assignment.
  const merged: Partial<Writable<SortableConfig>> = {};

  for (const fragment of [config, ...fragments]) {
    for (const key of LAST_WINS_KEYS) {
      const value = fragment[key];

      if (value !== undefined) {
        // Each write is per key, and each key's type is its own. The schema
        // list makes the write exhaustive, and the cast is confined to this
        // line.
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }

  // Nothing checks the merged result: `sortable()` takes a complete
  // `SortableConfig` and only the later fragments are `Partial`. So `items`,
  // `onReorder` and `axis` were supplied at a call that could not compile
  // without them.
  //
  // The `undefined` skip above must stay. A later fragment is a legal `Partial`
  // value and may carry `axis: undefined`. The skip means that a fragment that
  // names a required slot and supplies nothing cannot clear what the first
  // argument filled.
  return merged as SortableConfig;
}
