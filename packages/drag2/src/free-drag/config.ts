/**
 * The public, stable free-drag config schema, and the merge that folds
 * fragments into it.
 *
 * Every slot must be a named type alias. Method shorthand is checked
 * bivariantly even under `strict`, so `onEnd?(result): void` would silently
 * accept a handler narrowed to two of the three arms. That would defeat the
 * compiler-checked exhaustiveness the terminal relies on. The inline property
 * form does not work in this repo either: `method-signature-style` rewrites it
 * back into shorthand on every `lint-fix`. A named alias avoids both problems.
 *
 * Three of the aliases are qualified by behavior. `onStart`, `onEnd` and
 * `onError` exist on both ordinary configs with different structures, and both
 * aliases publish from their own root. `ResolveHandle` and `ResolveElement`
 * also collide but are structurally identical, so they stay unqualified.
 */
import type { Writable } from 'type-fest';
import type { DraggableError, DraggableWarning } from '../kernel/errors.ts';
import type { LiftMode } from '../kernel/presentation.ts';
import type {
  DragAxis,
  DragGeometry,
  FreeDragTransactionResult,
  OnDrop,
  ResolveHome,
} from './domain.ts';
import type {
  ConstraintInstaller,
  FreeDragLandingInstaller,
  FreeDragPlugin,
} from './feature.ts';

export type FreeDragOnStart = (geometry: DragGeometry) => void;
export type OnMove = (geometry: DragGeometry) => void;
/** Exactly once per started operation, whatever happened to it. */
export type FreeDragOnEnd = (result: FreeDragTransactionResult) => void;
/**
 * A `DraggableWarning` means this fault did not decide the outcome: a landing
 * measurement that could not be trusted, a disposer that refused, a throw that
 * a cancel or destruction had already superseded. The operation ends as it
 * would have without the fault. So do not wait on a warning for a terminal: the
 * terminal may already have arrived, and destruction publishes none. A
 * `DraggableError` means the fault changed the outcome.
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
 * Every slot is optional in a fragment. The required slot is required of the
 * first argument, where the compiler can see it.
 */
export type FreeDragConfig = Readonly<{
  /**
   * The one required slot. Leaving it out is a compile error. A later fragment
   * may replace it but cannot clear it, because the merge skips `undefined`.
   */
  onDrop: OnDrop;

  /* optional consumer functions */
  handle?: ResolveHandle;
  /** The node lifted. Defaults to the item. */
  visual?: ResolveElement;
  /**
   * Where a rejected or canceled drag returns to. Absent means the grab spot.
   */
  home?: ResolveHome;
  onStart?: FreeDragOnStart;
  /** Once per committed sample, after the visual is written. */
  onMove?: OnMove;
  onEnd?: FreeDragOnEnd;
  onError?: FreeDragOnDragError;

  /* scalars */
  /**
   * `'both' | 'x' | 'y'`, default `'both'`. Fixed for the controller's
   * lifetime. An axis applies to travel the operation has already accumulated,
   * so changing it mid-drag would reinterpret every pixel since the grab and
   * not change what happens next. A per-sample lock, such as a modifier key, is
   * a `bounds` installer, which runs on the present position.
   */
  axis?: DragAxis;
  /**
   * `LIFT_FAITHFUL`, `LIFT_FLAT` or `LIFT_IN_PLACE`, default `LIFT_FAITHFUL`.
   * The three constants publish from this entry beside the type.
   */
  lift?: LiftMode;
  /**
   * Activation travel in viewport pixels. Same default and domain as the
   * sortable's.
   */
  threshold?: number;

  /* optional capabilities */
  /**
   * From `free-drag/bounds.js`. Absent means unconstrained, and no bounds code.
   */
  bounds?: ConstraintInstaller;
  /** From `free-drag/landing.js`. Absent means no landing animation runs. */
  landing?: FreeDragLandingInstaller;

  /** Appended, never replaced. The one slot that concatenates. */
  plugins?: readonly FreeDragPlugin[];
}>;

/**
 * The merge iterates the schema, not the fragment's own keys. Copying whatever
 * a fragment carries would put an unknown key into the config, where nothing
 * reads it and nothing complains. Walking a fixed list makes a misspelled slot
 * a diagnosable no-op and not a silent one.
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
 * Merge semantics belong to the config slot, not to fragment provenance. For
 * scalars and plain consumer functions the last value wins. An atomic
 * capability installer wins the same way, as one whole slot. `plugins` appends
 * in fragment order.
 *
 * Last-wins is safe because installers run after the merge completes: a
 * capability that loses its slot is never constructed, so there is no cache to
 * free and no entry in `retireHooks` to retire.
 */
export function mergeFreeFragments(
  config: FreeDragConfig,
  fragments: ReadonlyArray<Partial<FreeDragConfig>>,
): FreeDragConfig {
  const merged: Partial<Writable<FreeDragConfig>> = {};
  const plugins: FreeDragPlugin[] = [];

  for (const fragment of [config, ...fragments]) {
    if (fragment.plugins !== undefined) {
      plugins.push(...fragment.plugins);
    }

    for (const key of LAST_WINS_KEYS) {
      const value = fragment[key];

      if (value !== undefined) {
        // The write is per-key and each key's type is its own. The schema list
        // makes it exhaustive, and the cast is confined to this line.
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }

  merged.plugins = plugins;

  // The required first argument justifies this cast. Nothing checks the merged
  // result: `freeDrag()` takes a complete `FreeDragConfig` and only the later
  // fragments are `Partial`, so `onDrop` was supplied at a call that could not
  // compile without it.
  //
  // The `undefined` skip above closes the remaining gap and must stay. A later
  // fragment may legally carry `onDrop: undefined`, and the skip means that a
  // fragment that names the slot and supplies nothing cannot clear it.
  return merged as FreeDragConfig;
}
