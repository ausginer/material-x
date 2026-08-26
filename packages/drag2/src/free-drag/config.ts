/**
 * The public, stable free-drag config schema and the merge that folds fragments
 * into it.
 *
 * **Every slot is a named type alias, and that is normative rather than
 * stylistic** (F-51). Method shorthand is checked bivariantly even under
 * `strict`, so `onEnd?(result): void` would silently accept a handler narrowed
 * to two of the three arms, defeating the compiler-checked exhaustiveness the
 * terminal relies on. The inline property form does not survive this repo
 * either: `method-signature-style` rewrites it back into shorthand on every
 * `lint-fix`. A named alias is immune to both.
 *
 * **Three of them are qualified by behavior** (D-109). `onStart`, `onEnd` and
 * `onError` exist on both ordinary configs with **different structures**, and
 * both aliases publish from their own root. `ResolveHandle` and `ResolveElement`
 * also collide but are structurally identical, so they stay unqualified.
 */
import type { Writable } from 'type-fest';
import type { DraggableError, DraggableWarning } from '../kernel/errors.ts';
import type {
  AxisSource,
  DragAxis,
  DragGeometry,
  FreeDragLift,
  FreeDragTransactionResult,
  OnDrop,
  ResolveHome,
} from './domain.ts';
import type { FreeDragInstaller } from './feature.ts';

export type FreeDragOnStart = (geometry: DragGeometry) => void;
export type OnMove = (geometry: DragGeometry) => void;
/** Exactly once per started operation, whatever happened to it. */
export type FreeDragOnEnd = (result: FreeDragTransactionResult) => void;
/**
 * **A `DraggableWarning` means the operation was not affected** — a landing
 * measurement that could not be trusted, a disposer that refused — and its
 * terminal still arrives. A `DraggableError` means it was.
 */
export type FreeDragOnDragError = (
  error: DraggableError | DraggableWarning,
) => void;
/**
 * Resolves the element within the item that must be pressed to start a drag.
 */
export type ResolveHandle = (item: HTMLElement) => HTMLElement | null;
export type ResolveElement = (item: HTMLElement) => HTMLElement;

/**
 * Every slot is optional in a *fragment*; the required one is required of the
 * **first argument**, which is where the compiler can see it.
 */
export type FreeDragConfig = Readonly<{
  /**
   * **The one required slot, and a compile error when absent.** A later
   * fragment may **replace** it and cannot **clear** it — the merge skips
   * `undefined`.
   */
  onDrop: OnDrop;

  /* optional consumer functions */
  handle?: ResolveHandle;
  /** The node lifted. Defaults to the item. */
  visual?: ResolveElement;
  /** Where a rejected or canceled drag returns to. Absent means the grab spot. */
  home?: ResolveHome;
  onStart?: FreeDragOnStart;
  /** Once per committed sample, **after** the visual is written. */
  onMove?: OnMove;
  onEnd?: FreeDragOnEnd;
  onError?: FreeDragOnDragError;

  /* scalars, and one scalar-or-source */
  /**
   * `'both' | 'x' | 'y'`, default `'both'`. A **function is a source** re-read
   * on `invalidate()` and at activation, never per sample.
   */
  axis?: DragAxis | AxisSource;
  /** `'faithful' | 'flat' | 'in-place'`, default `'faithful'`. */
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
 * (D-45). Scalars and plain consumer
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
