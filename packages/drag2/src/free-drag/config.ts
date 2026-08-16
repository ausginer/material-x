/**
 * The public, stable free-drag config schema and the merge that folds fragments
 * into it (contract 07 §The config schema).
 *
 * **Every slot is a named type alias, and that is normative rather than
 * stylistic** (F-51). Method shorthand is checked bivariantly even under
 * `strict`, so `onEnd?(result): void` would silently accept a handler narrowed
 * to two of the three arms — and D-62's whole claim is that the *compiler*
 * checks the consumer's exhaustiveness. The inline property form does not
 * survive this repo either: `method-signature-style` rewrites it back into
 * shorthand on every `lint-fix`. A named alias is immune to both.
 */
import type { Writable } from 'type-fest';
import type { DraggableError } from '../kernel/errors.ts';
import type {
  AxisSource,
  DragAxis,
  DragGeometry,
  FreeDragErrorContext,
  FreeDragLift,
  FreeDragTransactionResult,
  OnDrop,
  ResolveHome,
} from './domain.ts';
import type { FreeDragInstaller } from './feature.ts';

export type OnStart = (geometry: DragGeometry) => void;
export type OnMove = (geometry: DragGeometry) => void;
/** Exactly once per started operation, whatever happened to it (D-62, D-66). */
export type OnEnd = (result: FreeDragTransactionResult) => void;
export type OnDragError = (
  error: DraggableError,
  context: FreeDragErrorContext,
) => void;
/**
 * **Resolver only** — the shipped element form is withdrawn, unifying with the
 * sortable's slot. `handle: el` migrates to `handle: () => el`.
 */
export type ResolveHandle = (item: HTMLElement) => HTMLElement | null;
export type ResolveElement = (item: HTMLElement) => HTMLElement;

/**
 * Every slot is optional in a *fragment*; the required one is required of the
 * **first argument** (D-77), which is where the compiler can see it.
 */
export type FreeDragConfig = Readonly<{
  /**
   * **The one required slot, and a compile error when absent** (D-77). The
   * merge hid it from the compiler only while every argument was `Partial`; the
   * required first parameter is not. A later fragment may still **replace** it
   * and cannot **clear** it — the merge skips `undefined` (B-9).
   */
  onDrop: OnDrop;

  /* optional consumer functions */
  handle?: ResolveHandle;
  /** The node lifted. Defaults to the item. */
  visual?: ResolveElement;
  /** Where a rejected or canceled drag returns to. Absent means the grab spot. */
  home?: ResolveHome;
  onStart?: OnStart;
  /** Once per committed sample, **after** the visual is written. */
  onMove?: OnMove;
  onEnd?: OnEnd;
  onError?: OnDragError;

  /* scalars, and one scalar-or-source */
  /**
   * `'both' | 'x' | 'y'`, default `'both'`. A **function is a source** re-read
   * on `invalidate()` and at activation, never per sample (D-71).
   */
  axis?: DragAxis | AxisSource;
  /** `'faithful' | 'flat' | 'in-place'`, default `'faithful'` (D-73). */
  lift?: FreeDragLift;
  /** Activation travel in viewport pixels. Same default and domain as the sortable's. */
  threshold?: number;

  /* optional capabilities */
  /** From `free-drag/bounds.js`. Absent means unconstrained, and no bounds code. */
  bounds?: FreeDragInstaller;
  /** From `free-drag/landing.js`. Absent means the visual is released without animating. */
  landing?: FreeDragInstaller;

  /** Appended, never replaced. The one slot that concatenates. */
  plugins?: readonly FreeDragInstaller[];
}>;

/**
 * **The merge iterates the schema, not the fragment's own keys.** Copying
 * whatever a fragment happens to carry would put an unknown key into the
 * config, where nothing reads it and nothing complains; walking a fixed list
 * makes a misspelled slot a diagnosable no-op rather than a silent one.
 *
 * `plugins` is absent here because it is the one appending slot.
 */
const LAST_WINS_KEYS = [
  'onDrop',
  'handle',
  'visual',
  'home',
  'onStart',
  'onMove',
  'onEnd',
  'onError',
  'axis',
  'lift',
  'threshold',
  'bounds',
  'landing',
] as const satisfies ReadonlyArray<keyof FreeDragConfig>;

/**
 * **Merge semantics belong to the config slot, not to fragment provenance**
 * (D-45, unchanged for the second behavior). Scalars and plain consumer
 * functions last-win, an atomic capability installer last-wins as one whole
 * slot, and `plugins` appends in fragment order.
 *
 * **Last-wins is safe precisely because installers are invoked after the merge
 * completes** (D-57): a capability that loses its slot is never constructed, so
 * there is no cache to free and no entry in `retireHooks` to retire.
 */
export function mergeFreeFragments(
  config: FreeDragConfig,
  fragments: ReadonlyArray<Partial<FreeDragConfig>>,
): FreeDragConfig {
  const merged: Partial<Writable<FreeDragConfig>> = {};
  const plugins: FreeDragInstaller[] = [];

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

  // **The cast is what the required first argument pays for** (D-77): nothing
  // checks the merged result, because `freeDrag()` takes a complete
  // `FreeDragConfig` and only the *later* fragments are `Partial`, so `onDrop`
  // was supplied at a call that could not compile without it.
  //
  // **The `undefined` skip above is what closes the remaining hole, and it is
  // load-bearing rather than a nicety** (B-9): a later fragment may legally
  // carry `onDrop: undefined`, and skipping it means a fragment that names the
  // slot and supplies nothing cannot clear it.
  return merged as FreeDragConfig;
}
