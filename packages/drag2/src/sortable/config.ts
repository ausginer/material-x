/**
 * **A fragment is a plain declarative partial config** (D-45, superseding D-12).
 *
 * Every argument after `root` is an ordinary object literal carrying no brand,
 * no `kind` tag and no provenance. The library merges them, because one slot
 * must not last-win: `plugins` **concatenates**, and a consumer writing an
 * object spread has no way to express that. Keeping the merge inside the
 * library is the whole of what the variadic form buys.
 */
import type { Writable } from 'type-fest';
import type { DraggableError, DraggableWarning } from '../kernel/errors.ts';
import type { OnReorder, ReorderTransactionResult } from './domain.ts';
import type { AxisInstaller, SortableInstaller } from './feature.ts';

import type { PlaceholderFactory } from './placement.ts';

/**
 * **Every callback slot is a named type alias, and that is normative rather
 * than stylistic** (F-51). Two facts force it, and a compiled fixture found
 * both: method shorthand is checked **bivariantly** even under `strict`, so a
 * handler narrowed to a subset of a union's arms is silently accepted; and the
 * inline property form does not survive this repo, because
 * `@typescript-eslint/method-signature-style` is configured to `method` and
 * `just lint-fix` rewrites it back into shorthand.
 *
 * A rule the next format reverses is not a rule. A named alias is immune — the
 * lint rule normalises inline function-type literals and leaves type references
 * alone.
 *
 * **Three of them are qualified by behavior** (D-109). `onStart`, `onEnd` and
 * `onError` exist on both ordinary configs with **different structures**, which
 * is D-75's only condition for qualifying a name, and both aliases publish from
 * their own root. `ResolveHandle` and `ResolveElement` also collide and are
 * structurally identical, so they stay unqualified — the rule discriminates
 * rather than blankets. A released consumer cannot have the symmetry added
 * later, so it is added before publication.
 */
export type SortableOnStart = (item: HTMLElement) => void;
/**
 * **One argument since D-130.** ~~`(error, context)`, where the context carried
 * `domain`.~~ That copy was strictly redundant with the terminal: its only
 * non-null producer was the settlement-failure path, `finalized` publishes the
 * same `current.domain` to `onEnd`, and D-66 makes the terminal
 * unconditional — so a non-null `domain` always implied an `onEnd` carrying it.
 * It was also *worse* than redundant on one path: `onError` runs in `REPORTING`
 * and `onEnd` in `FINALIZING`, so a second failure arriving between them left
 * the context stale relative to the terminal the consumer was about to receive.
 *
 * **A `DraggableWarning` means the operation was not affected** — a landing
 * measurement that could not be trusted, a disposer that refused — and its
 * terminal still arrives. A `DraggableError` means it was.
 */
export type SortableOnDragError = (
  error: DraggableError | DraggableWarning,
) => void;
/**
 * **One terminal callback, four arms** (D-62). ~~`onFinish` and `onCancel`~~
 * were two signatures over one union, and the partitions that typed them —
 * `SortableFinishResult`, `SortableCancelResult` — existed for no other reason.
 *
 * The alias is what makes the exhaustiveness D-62 promises real: under method
 * shorthand a handler narrowed to two of the four arms is accepted silently
 * (F-51).
 */
export type SortableOnEnd = (result: ReorderTransactionResult) => void;
export type ResolveHandle = (item: HTMLElement) => HTMLElement | null;
export type ResolveElement = (item: HTMLElement) => HTMLElement;
/**
 * The collection, pulled on demand.
 *
 * **Every element it returns must be distinct, and that is a definition rather
 * than a restriction** (D-121). The pair this API publishes is
 * `{ from, to }`: `from` indexes the collection you returned, `to` indexes the
 * **destination view** — the same collection minus the dragged element — and
 * the two spaces differ by exactly one *only while the dragged element occurs
 * once*. Uniqueness is the condition under which `{ from, to }` has a meaning
 * at all, so a collection naming one element twice has no reorder to describe.
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
 * equal-but-new array is what tells the library membership may have changed
 * (D-44).
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
  /**
   * `y()` or `xy()`. An **atomic** capability slot: one installer, one whole.
   *
   * Typed as an `AxisInstaller` rather than a `SortableInstaller` (D-77): the
   * contribution it returns must carry `insertion`, so a plugin-shaped
   * installer is not assignable and the assembler needs no check for one.
   */
  axis: AxisInstaller;

  /* optional consumer functions */
  onStart?: SortableOnStart;
  /** Exactly once per started operation, whatever happened to it (D-62, D-66). */
  onEnd?: SortableOnEnd;
  onError?: SortableOnDragError;
  handle?: ResolveHandle;
  /**
   * The node **faithfully lifted** — what the user sees travel (D-43).
   *
   * Defaults to the item.
   */
  visual?: ResolveElement;
  /**
   * The **geometry source**: the element whose footprint the placeholder
   * stands in for, and the element every insertion candidate is measured on
   * (D-43, D-58). `box(item) = visual(item)` by default, which is the common
   * case and costs it nothing.
   *
   * **Separate from `visual` because they answer different questions.** They
   * diverge when the lifted node is nested inside the element that actually
   * holds the space — a row that lifts its inner card, say. api-1 measured the
   * case: sizing the placeholder from the visual ran the list 30 px too tall
   * for an entire drag, because the visual's own height is not the height its
   * removal freed.
   *
   * **Scope limits, stated positively** (D-43): visual order must follow DOM
   * order, rule-placed layouts are unsupported, and in grid `box` must equal
   * `visual`. Nothing detects a violation — the shipped package fails these
   * layouts too, silently — so this is a documented boundary, not a guard.
   */
  box?: ResolveElement;
  /**
   * D-65 — the callback itself, not `createPlaceholder` plus a class name. The
   * behavior always creates a placeholder; this only changes which element it
   * is. Must return a **detached** element that is neither the dragged item nor
   * its visual.
   *
   * Nothing detects a violation — the returned element is **adopted**:
   * activation inserts it, every move relocates it, and teardown removes it, so
   * returning an attached node hands the library ownership of something the
   * page owns and teardown then deletes it. A documented boundary, not a guard.
   */
  placeholder?: PlaceholderFactory;

  /* optional capabilities */
  landing?: SortableInstaller;

  /** Appended, never replaced. */
  plugins?: readonly SortableInstaller[];

  threshold?: number;
}>;

/**
 * **The merge iterates the schema, not the fragment's own keys.** Copying
 * whatever a fragment happens to carry would put an unknown key into the
 * config, where nothing reads it and nothing complains; walking a fixed list
 * makes a misspelled slot a diagnosable no-op rather than a silent one.
 *
 * `plugins` is absent here because it is the one appending slot and is handled
 * separately.
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
  'threshold',
] as const satisfies ReadonlyArray<keyof SortableConfig>;

/**
 * **Merge semantics belong to the config slot, not to fragment provenance.**
 * The slot's kind decides and a fragment gets no say: scalars and plain
 * consumer functions last-win, an atomic capability installer last-wins as one
 * whole slot, and `plugins` appends in fragment order.
 *
 * **Last-wins is safe precisely because installers are invoked after the merge
 * completes.** A capability that loses its slot is never constructed — no cache
 * is allocated, no entry appears in `retireHooks`, and there is nothing to
 * retire. Under D-12, where the factory ran during the fold, a later feature
 * overwriting an earlier one would have meant retiring a live contribution
 * mid-assembly.
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
  const plugins: SortableInstaller[] = [];

  for (const fragment of [config, ...fragments]) {
    if (fragment.plugins !== undefined) {
      plugins.push(...fragment.plugins);
    }

    for (const key of LAST_WINS_KEYS) {
      const value = fragment[key];

      if (value !== undefined) {
        // The write is per-key and each key's type is its own; the schema list
        // is what makes it exhaustive, and the cast is confined to this line.
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }

  merged.plugins = plugins;
  // **The cast is what the required first argument pays for** (D-77). Nothing
  // checks the merged result any more, because nothing has to: `sortable()`
  // takes a complete `SortableConfig` and only the *later* fragments are
  // `Partial`, so `items`, `onReorder` and `axis` were supplied at the call
  // that could not compile without them.
  //
  // **The `undefined` skip above is what closes the remaining hole, and it is
  // load-bearing rather than a nicety** (B-9). A later fragment is a legal
  // `Partial` value and may carry `axis: undefined`; skipping it means a
  // required slot the first argument filled cannot be cleared by a fragment
  // that names it and supplies nothing.
  return merged as SortableConfig;
}
