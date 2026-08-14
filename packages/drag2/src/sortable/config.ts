/**
 * **A fragment is a plain declarative partial config** (D-45, superseding D-12).
 *
 * Every argument after `root` is an ordinary object literal carrying no brand,
 * no `kind` tag and no provenance. The library merges them, because one slot
 * must not last-win: `plugins` **concatenates**, and a consumer writing an
 * object spread has no way to express that. Keeping the merge inside the
 * library is the whole of what the variadic form buys.
 */
import type { DraggableError } from '../kernel/errors.ts';
import type {
  DragErrorContext,
  OnReorder,
  SortableCancelResult,
  SortableFinishResult,
} from './domain.ts';
import type { SortableInstaller } from './feature.ts';

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
 */
export type OnStart = (item: HTMLElement) => void;
export type OnDragError = (
  error: DraggableError,
  context: DragErrorContext,
) => void;
export type OnFinish = (result: SortableFinishResult) => void;
export type OnCancel = (result: SortableCancelResult) => void;
export type ResolveHandle = (item: HTMLElement) => HTMLElement | null;
export type ResolveElement = (item: HTMLElement) => HTMLElement;
export type ItemSource = () => readonly HTMLElement[];

/**
 * The public, stable schema. Every slot is optional in a *fragment*; the
 * required ones are required of the **merged** result.
 */
export type SortableConfig = Readonly<{
  /* required after the merge */
  items: ItemSource;
  onReorder: OnReorder;
  /** `y()` or `xy()`. An **atomic** capability slot: one installer, one whole. */
  axis: SortableInstaller;

  /* optional consumer functions */
  onStart?: OnStart;
  onFinish?: OnFinish;
  onCancel?: OnCancel;
  onError?: OnDragError;
  handle?: ResolveHandle;
  visual?: ResolveElement;
  /**
   * D-65 — the callback itself, not `createPlaceholder` plus a class name. The
   * behavior always creates a placeholder; this only changes which element it
   * is. Must return a **detached** element that is neither the dragged item nor
   * its visual.
   */
  placeholder?: PlaceholderFactory;

  /* optional capabilities */
  landing?: SortableInstaller;

  /** Appended, never replaced. */
  plugins?: readonly SortableInstaller[];

  threshold?: number;
}>;

type MutableConfig = {
  -readonly [K in keyof SortableConfig]: SortableConfig[K];
};

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
  'onFinish',
  'onCancel',
  'onError',
  'handle',
  'visual',
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
  fragments: ReadonlyArray<Partial<SortableConfig>>,
): SortableConfig {
  // Partial while it is being built, because a *fragment* owes nothing: whether
  // the required slots were ever supplied is a property of the finished merge,
  // and `assemble()` is the only place that can ask.
  const merged: Partial<MutableConfig> = {};
  const plugins: SortableInstaller[] = [];

  for (const fragment of fragments) {
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
  // The one narrowing the type cannot do: `assemble()` diagnoses a missing
  // `items`, `onReorder` or `axis` before it constructs anything, so every
  // consumer of the result already runs behind that check.
  return merged as SortableConfig;
}
