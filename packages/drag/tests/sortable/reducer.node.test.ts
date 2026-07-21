import { describe, expect, it } from 'vitest';
import { createIdentitySource } from '../../src/kernel/operation-id.ts';
import {
  CANCEL_ESCAPE,
  LIFECYCLE_ACTIVATION_FAILED,
  LIFECYCLE_ACTIVATION_READY,
  LIFECYCLE_ADMIT,
  LIFECYCLE_CANCEL,
  LIFECYCLE_MOVE,
  LIFECYCLE_RELEASE,
  LIFECYCLE_START_SUCCEEDED,
  PHASE_ACTIVATING,
  PHASE_AWAITING_RESULT,
  PHASE_DRAGGING,
  PHASE_IDLE,
  PHASE_PENDING,
} from '../../src/kernel/protocol.ts';
import {
  createSortableReducer,
  INITIAL_SORTABLE_STATE,
  INPUT_POINTER,
  INSERTION_READY,
  LANDING_PINNED,
  type SortableCandidate,
  type SortableEvent,
  type SortableState,
} from '../../src/sortable/reducer.ts';
import type {
  CollectionSnapshot,
  Insertion,
} from '../../src/sortable/options.ts';

/**
 * A labelled sentinel element. The reducer only ever compares references and
 * reads collection membership, so this is a faithful stand-in.
 */
const el = (label: string): HTMLElement =>
  ({ label, nodeType: 1 }) as unknown as HTMLElement;

const A = el('a');
const B = el('b');
const C = el('c');

const SNAPSHOT: CollectionSnapshot = { items: [A, B, C], version: 1 };

const INSERTION: Insertion = {
  version: 1,
  index: 2,
  before: B,
  after: C,
};

const CANDIDATE: SortableCandidate = {
  visual: A,
  activationVersion: 1,
  activationIndex: 0,
  insertion: INSERTION,
};

function harness(): {
  reduce: (from: SortableState, event: SortableEvent) => SortableState;
  run: (from: SortableState, ...events: SortableEvent[]) => SortableState;
} {
  const reduce = createSortableReducer(
    { threshold: 8 },
    createIdentitySource(),
  );
  return { reduce, run: (from, ...events) => events.reduce(reduce, from) };
}

const admit = (operationId = 1, pointerId = 1): SortableEvent => ({
  type: LIFECYCLE_ADMIT,
  operationId,
  input: INPUT_POINTER,
  item: A,
  pointerId,
  point: { x: 0, y: 0 },
  collection: SNAPSHOT,
});

const move = (x: number, y: number, pointerId = 1): SortableEvent => ({
  type: LIFECYCLE_MOVE,
  pointerId,
  point: { x, y },
});

const release = (x: number, y: number, pointerId = 1): SortableEvent => ({
  type: LIFECYCLE_RELEASE,
  pointerId,
  point: { x, y },
});

const activationReady = (operationId = 1): SortableEvent => ({
  type: LIFECYCLE_ACTIVATION_READY,
  operationId,
  candidate: CANDIDATE,
});

const startSucceeded = (operationId = 1): SortableEvent => ({
  type: LIFECYCLE_START_SUCCEEDED,
  operationId,
});

/** Drives a fresh operation all the way to `dragging`. */
const dragging = (run: ReturnType<typeof harness>['run']): SortableState =>
  run(
    INITIAL_SORTABLE_STATE,
    admit(),
    move(0, 20),
    activationReady(),
    startSucceeded(),
  );

describe('sortable reducer: admission and activation', () => {
  it('should arm a pending operation on admit', () => {
    const { run } = harness();
    const state = run(INITIAL_SORTABLE_STATE, admit());

    expect(state.phase).toBe(PHASE_PENDING);
    expect(state.operation?.operationId).toBe(1);
    expect(state.pointer?.id).toBe(1);
  });

  it('should stay pending while movement is under the threshold', () => {
    const { run } = harness();

    expect(run(INITIAL_SORTABLE_STATE, admit(), move(3, 4)).phase).toBe(
      PHASE_PENDING,
    );
  });

  it('should activate once movement reaches the threshold', () => {
    const { run } = harness();

    expect(run(INITIAL_SORTABLE_STATE, admit(), move(8, 0)).phase).toBe(
      PHASE_ACTIVATING,
    );
  });

  it('should stay activating when the candidate is committed', () => {
    const { run } = harness();
    const state = run(
      INITIAL_SORTABLE_STATE,
      admit(),
      move(0, 20),
      activationReady(),
    );

    expect(state.phase).toBe(PHASE_ACTIVATING);
  });

  it('should commit the activation insertion with the candidate', () => {
    const { run } = harness();
    const state = run(
      INITIAL_SORTABLE_STATE,
      admit(),
      move(0, 20),
      activationReady(),
    );

    expect(state.insertion.type).toBe(INSERTION_READY);
  });

  it('should reach dragging only after start succeeds', () => {
    const { run } = harness();

    expect(dragging(run).phase).toBe(PHASE_DRAGGING);
  });

  it('should return to idle when activation fails', () => {
    const { run } = harness();
    const state = run(INITIAL_SORTABLE_STATE, admit(), move(0, 20), {
      type: LIFECYCLE_ACTIVATION_FAILED,
      operationId: 1,
    });

    expect(state.phase).toBe(PHASE_IDLE);
    expect(state.operation).toBeNull();
  });

  it('should ignore a second admit while an operation is already armed', () => {
    const { run } = harness();
    const state = run(INITIAL_SORTABLE_STATE, admit(1), admit(2));

    // At most one pointer or keyboard reorder operation may be active.
    expect(state.operation?.operationId).toBe(1);
  });
});

describe('sortable reducer: disarm', () => {
  it('should disarm a pending operation when the pointer is released', () => {
    const { run } = harness();
    const state = run(INITIAL_SORTABLE_STATE, admit(), release(1, 1));

    expect(state.phase).toBe(PHASE_IDLE);
    expect(state.operation).toBeNull();
    expect(state.pointer).toBeNull();
  });

  it('should not activate on a move after a pending release', () => {
    const { run } = harness();
    const state = run(
      INITIAL_SORTABLE_STATE,
      admit(),
      release(1, 1),
      move(0, 500),
    );

    expect(state.phase).toBe(PHASE_IDLE);
  });

  it('should disarm a pending operation on cancel without settling', () => {
    const { run } = harness();
    const state = run(INITIAL_SORTABLE_STATE, admit(), {
      type: LIFECYCLE_CANCEL,
      reason: { type: CANCEL_ESCAPE },
    });

    expect(state.phase).toBe(PHASE_IDLE);
    expect(state.settlement).toBeNull();
  });
});

describe('sortable reducer: currency', () => {
  it('should ignore a move from a foreign pointer', () => {
    const { reduce, run } = harness();
    const armed = run(INITIAL_SORTABLE_STATE, admit(1, 1));

    expect(reduce(armed, move(0, 500, 99))).toBe(armed);
  });

  it('should not let a foreign pointer cross the activation threshold', () => {
    const { run } = harness();
    const state = run(INITIAL_SORTABLE_STATE, admit(1, 1), move(0, 500, 99));

    expect(state.phase).toBe(PHASE_PENDING);
  });

  it('should ignore a release from a foreign pointer', () => {
    const { reduce, run } = harness();
    const armed = run(INITIAL_SORTABLE_STATE, admit(1, 1));

    expect(reduce(armed, release(0, 0, 99))).toBe(armed);
  });

  it('should ignore activation-ready for a superseded operation', () => {
    const { reduce, run } = harness();
    const activating = run(INITIAL_SORTABLE_STATE, admit(1), move(0, 20));

    expect(reduce(activating, activationReady(42))).toBe(activating);
  });

  it('should ignore start-succeeded for a superseded operation', () => {
    const { reduce, run } = harness();
    const ready = run(
      INITIAL_SORTABLE_STATE,
      admit(1),
      move(0, 20),
      activationReady(1),
    );

    expect(reduce(ready, startSucceeded(42))).toBe(ready);
  });

  it('should ignore a landing pin while no landing is running', () => {
    const { reduce, run } = harness();
    const active = dragging(run);

    expect(
      reduce(active, { type: LANDING_PINNED, operationId: 1, landingId: 7 }),
    ).toBe(active);
  });
});

describe('sortable reducer: no-effect guard', () => {
  it('should return the identical state for an event it ignores', () => {
    const { reduce } = harness();

    expect(reduce(INITIAL_SORTABLE_STATE, move(10, 10))).toBe(
      INITIAL_SORTABLE_STATE,
    );
  });

  it('should return the identical state for a release with nothing armed', () => {
    const { reduce } = harness();

    expect(reduce(INITIAL_SORTABLE_STATE, release(10, 10))).toBe(
      INITIAL_SORTABLE_STATE,
    );
  });

  it('should return the identical state for a move the classifier ignores mid-drag', () => {
    const { reduce, run } = harness();
    const active = dragging(run);

    // A foreign pointer is inert even while a drag is running, so the session
    // sees no transition and runs no effects.
    expect(reduce(active, move(0, 30, 99))).toBe(active);
  });
});

describe('sortable reducer: release', () => {
  it('should enter awaiting-result on release while dragging', () => {
    const { run } = harness();

    expect(run(dragging(run), release(0, 40)).phase).toBe(
      PHASE_AWAITING_RESULT,
    );
  });

  it('should carry the pointer release coordinates into state', () => {
    const { run } = harness();
    const state = run(dragging(run), move(0, 30), release(5, 45));

    expect(state.pointer?.release).toEqual({ x: 5, y: 45 });
  });
});
