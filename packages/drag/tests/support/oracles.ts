/**
 * Two oracles that check drag from outside it, installed on the prototypes of the
 * classes its modules export, so that they run against the source and the
 * published build alike. A project's setup file installs them, on `src` or on the
 * emitted modules, and no test knows which.
 *
 * - **Equivalence** (`drag:DRD-52`, `drag:DRD-67`): after a committed move, the
 *   window `y()` predicted equals a fresh measurement of the same slots.
 * - **Refusals** (`drag:DRI-6`): each event a running pass refuses is counted
 *   once, trusted and untrusted apart.
 *
 * Both depend on drag's internal call protocol, named at each wrapper. A refactor
 * that changes it disconnects an oracle without an error, and the liveness tests
 * in `equivalence-check.browser.test.ts` and `refusals.browser.test.ts` are what
 * then fail.
 *
 * A mismatch or a refusal is recorded, never thrown, so the drag runs on as it
 * would without the oracle. A test that ends with a mismatch it did not take, or
 * with a trusted refusal, fails.
 */
import { afterEach, beforeEach } from 'vitest';
import type { Gesture } from '../../src/kernel/gesture.ts';
import type { RectIndex } from '../../src/sortable/rect-index.ts';

/** The fields a slot packs: left, top, right, bottom, center x and center y. */
const STRIDE = 6;

/** The slot `at` reads the placeholder at. */
const PLACEHOLDER = -1;

/**
 * The precision to which drag's cache is specified to agree with a measurement
 * (`drag:DRI-14`).
 */
const SLACK = 1 / 16;

export type RefusalCounts = Readonly<{ trusted: number; untrusted: number }>;

let checks = 0;
const mismatches: string[] = [];
let trusted = 0;
let untrusted = 0;

/** How many times the equivalence oracle compared a prediction in this test. */
export function equivalenceChecks(): number {
  return checks;
}

/**
 * The mismatches recorded in this test, each named like `slot 2` or `the
 * placeholder`. Taking them consumes them, so a test about a list outside the rule
 * reads the ones it expects and still passes.
 */
export function takeMismatches(): string[] {
  return mismatches.splice(0);
}

/** The events a running pass refused in this test. */
export function refusals(): RefusalCounts {
  return { trusted, untrusted };
}

type CollectionSnapshot = Parameters<RectIndex['collect']>[0];
type Field = Parameters<RectIndex['at']>[1];
// oxlint-disable-next-line typescript/no-explicit-any -- any gesture, whatever it drives
type AnyGesture = Gesture<any, any, any>;
type GetBox = Parameters<RectIndex['measure']>[2];
type DisplacementSink = Parameters<RectIndex['measure']>[3];

/** One live index's state, between a committed move and the next resolution. */
type Pending = {
  /** A `shift` that no `collect` has checked yet. */
  shifted: boolean;
  /**
   * The placeholder's left and right as the cache held them before the re-read
   * that follows a committed move, or `NaN` when there was no re-read.
   */
  heldLeft: number;
  heldRight: number;
  /** The collection version of the last `collect`, or `-1` before one. */
  version: number;
  /** What the last `measure` was given, to measure the fresh index alike. */
  getBox: GetBox;
  displacement: DisplacementSink;
};

/**
 * Wraps `collect`, `measure`, `shift`, `measurePlaceholder`, `invalidate` and
 * `retire`. The protocol is `LinearShift`'s: a committed move calls `shift`; the
 * next frame's `refresh` calls `measurePlaceholder`, then `collect` with the same
 * collection version, unless `invalidate` or `retire` came between. At that
 * `collect`, the window still holds the prediction, and the oracle compares it
 * with a separate index of the same class that measures the same slots through
 * the same `getBox` and sink. It writes nothing to the live index or the DOM.
 */
function installEquivalence(Index: typeof RectIndex): void {
  const { prototype } = Index;
  const { collect, measure, shift, measurePlaceholder, invalidate, retire } =
    prototype;
  const states = new WeakMap<RectIndex, Pending>();
  const stateOf = (index: RectIndex): Pending => {
    let state = states.get(index);

    if (!state) {
      state = {
        shifted: false,
        heldLeft: Number.NaN,
        heldRight: Number.NaN,
        version: -1,
        getBox: undefined,
        displacement: undefined,
      };
      states.set(index, state);
    }

    return state;
  };
  const compare = (
    index: RectIndex,
    state: Pending,
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    placeholder: HTMLElement,
  ): string => {
    const { first, end, count } = index;
    const fresh = new (index.constructor as typeof RectIndex)();

    collect.call(fresh, snapshot, dragged, placeholder, first);
    measure.call(fresh, first, end, state.getBox, state.displacement);

    if (fresh.count !== count) {
      return `count ${count}, measured ${fresh.count}`;
    }

    for (let slot = 0; slot < count; slot += 1) {
      if (index.item(slot) !== fresh.item(slot)) {
        return `slot ${slot}`;
      }
    }

    const differs = (slot: number, field: Field, held: number): boolean =>
      Math.abs(held - fresh.at(slot, field)) > SLACK;

    for (let slot = first; slot < end; slot += 1) {
      for (let field = 0; field < STRIDE; field += 1) {
        if (differs(slot, field as Field, index.at(slot, field as Field))) {
          return `slot ${slot}`;
        }
      }
    }

    // A relocation leaves the placeholder's x where the last rebuild measured it,
    // and the re-read replaced it in the cache.
    const placeholderEdges = [
      Number.isNaN(state.heldLeft) ? index.at(PLACEHOLDER, 0) : state.heldLeft,
      index.at(PLACEHOLDER, 1),
      Number.isNaN(state.heldRight)
        ? index.at(PLACEHOLDER, 2)
        : state.heldRight,
      index.at(PLACEHOLDER, 3),
    ];

    for (const [field, held] of placeholderEdges.entries()) {
      if (differs(PLACEHOLDER, field as Field, held)) {
        return 'the placeholder';
      }
    }

    return '';
  };

  Object.assign(prototype, {
    measure(this: RectIndex, ...args: Parameters<RectIndex['measure']>): void {
      const state = stateOf(this);

      [, , state.getBox, state.displacement] = args;
      measure.apply(this, args);
    },
    shift(this: RectIndex, ...args: Parameters<RectIndex['shift']>): void {
      const state = stateOf(this);

      shift.apply(this, args);
      state.shifted = true;
      state.heldLeft = Number.NaN;
      state.heldRight = Number.NaN;
    },
    measurePlaceholder(this: RectIndex, placeholder: HTMLElement): void {
      const state = stateOf(this);

      if (state.shifted && Number.isNaN(state.heldLeft)) {
        state.heldLeft = this.at(PLACEHOLDER, 0);
        state.heldRight = this.at(PLACEHOLDER, 2);
      }

      measurePlaceholder.call(this, placeholder);
    },
    collect(
      this: RectIndex,
      snapshot: CollectionSnapshot,
      dragged: HTMLElement,
      placeholder: HTMLElement,
      slot: number,
    ): void {
      const state = stateOf(this);

      if (state.shifted && state.version === snapshot.version) {
        state.shifted = false;
        checks += 1;

        const mismatch = compare(this, state, snapshot, dragged, placeholder);

        if (mismatch) {
          mismatches.push(mismatch);
        }
      }

      state.version = snapshot.version;
      collect.call(this, snapshot, dragged, placeholder, slot);
    },
    invalidate(this: RectIndex): void {
      stateOf(this).shifted = false;
      invalidate.call(this);
    },
    retire(this: RectIndex): void {
      stateOf(this).shifted = false;
      retire.call(this);
    },
  });
}

/**
 * Wraps `enter`. Input reaches it as `enter(step, event, receiver)` through the
 * prototype, from the gesture's own listener and from the session's, and a
 * running pass refuses it. So a call with a step and an `Event` while another
 * `enter` of the same gesture is on the stack is a refusal. One event refused by
 * two listeners counts once.
 */
function installRefusals(GestureClass: typeof Gesture): void {
  const { prototype } = GestureClass;
  const { enter: originalEnter } = prototype;
  const depths = new WeakMap<AnyGesture, number>();
  const counted = new WeakSet<Event>();

  prototype.enter = function enter(
    this: AnyGesture,
    step?: (argument: unknown) => void,
    argument?: unknown,
    receiver?: object,
  ): void {
    const depth = depths.get(this) ?? 0;

    if (
      depth > 0 &&
      step &&
      argument instanceof Event &&
      !counted.has(argument)
    ) {
      counted.add(argument);

      if (argument.isTrusted) {
        trusted += 1;
      } else {
        untrusted += 1;
      }
    }

    depths.set(this, depth + 1);

    try {
      originalEnter.call(this, step!, argument, receiver);
    } finally {
      depths.set(this, depth);
    }
  };
}

/**
 * Installs both oracles on the classes given, and the per-test reset and check.
 * `afterEach` hooks run in reverse order of registration, and a setup file
 * registers first, so the check runs after the test's own cleanup.
 */
export function installOracles(
  Index: typeof RectIndex,
  GestureClass: typeof Gesture,
): void {
  installEquivalence(Index);
  installRefusals(GestureClass);

  beforeEach(() => {
    checks = 0;
    mismatches.length = 0;
    trusted = 0;
    untrusted = 0;
  });

  afterEach(() => {
    // `drag:DRI-6`, across every test: no trusted event is ever refused.
    if (trusted > 0) {
      throw new Error(`refused ${trusted} trusted events`);
    }

    if (mismatches.length > 0) {
      throw new Error(
        `the predicted insertion geometry disagreed with a fresh measurement at ${mismatches.join(', ')}`,
      );
    }
  });
}
