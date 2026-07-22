import { describe, expect, it } from 'vitest';
import { IDENTITY_MAPPER } from '../../src/kernel/coordinate.ts';
import { createIdentitySource } from '../../src/kernel/operation-id.ts';
import type { DOMRealm } from '../../src/kernel/realm.ts';
import { LIFT_FAITHFUL } from '../../src/kernel/presentation.ts';
import {
  CANCEL_ESCAPE,
  LANDING_PREPARING,
  LANDING_SKIPPED,
  LIFECYCLE_ACTIVATION_FAILED,
  LIFECYCLE_ACTIVATION_READY,
  LIFECYCLE_ADMIT,
  LIFECYCLE_CANCEL,
  LIFECYCLE_MOVE,
  LIFECYCLE_RELEASE,
  LIFECYCLE_START_SUCCEEDED,
  OUTCOME_ACCEPTED,
  PHASE_ACTIVATING,
  PHASE_AWAITING_RESULT,
  PHASE_DRAGGING,
  PHASE_IDLE,
  PHASE_PENDING,
  PHASE_SETTLING,
  PRESENTATION_PENDING,
  PRESENTATION_READY,
} from '../../src/kernel/protocol.ts';
import { AXIS_X } from '../../src/kernel/types.ts';
import {
  createDraggableReducer,
  DROP_AWAITING_CONSUMER,
  DROP_PROPOSAL_READY,
  DROP_RESOLVED,
  RESOLUTION_STARTED,
  type FreeCandidate,
  INITIAL_DRAGGABLE_STATE,
  LANDING_PINNED,
  PRESENTATION_SETTLED,
  SET_POLICY,
  type DraggableEvent,
  type DraggableState,
} from '../../src/draggable/reducer.ts';
import { FreeDropResolution } from '../../src/draggable/options.ts';

/**
 * A realm exposing only what the reducer reads from it: the rect constructor
 * used to derive the release geometry. Supplying it here is the point — the
 * reducer must never reach for an ambient global.
 */
const REALM = {
  window: {
    DOMRectReadOnly: class {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly left: number;
      readonly top: number;
      readonly right: number;
      readonly bottom: number;

      constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.left = x;
        this.top = y;
        this.right = x + width;
        this.bottom = y + height;
      }
    },
  },
} as unknown as DOMRealm;

const ITEM = { nodeType: 1 } as unknown as HTMLElement;
const VISUAL = ITEM;

const RECT = {
  left: 0,
  top: 0,
  width: 50,
  height: 50,
  right: 50,
  bottom: 50,
} as DOMRectReadOnly;

const CANDIDATE: FreeCandidate = {
  visual: VISUAL,
  lift: LIFT_FAITHFUL,
  originRect: RECT,
  coordinateSpace: IDENTITY_MAPPER,
};

/**
 * A reducer plus the shared id source, so a test can mint the same currency the
 * production wiring would.
 */
function harness(hasHomeTarget = false): {
  reduce: (from: DraggableState, event: DraggableEvent) => DraggableState;
  run: (from: DraggableState, ...events: DraggableEvent[]) => DraggableState;
} {
  const reduce = createDraggableReducer(
    { threshold: 8, hasHomeTarget, realm: REALM },
    createIdentitySource(),
  );
  return {
    reduce,
    run: (from, ...events) => events.reduce(reduce, from),
  };
}

const admit = (operationId = 1, pointerId = 1): DraggableEvent => ({
  type: LIFECYCLE_ADMIT,
  operationId,
  item: ITEM,
  pointerId,
  point: { x: 0, y: 0 },
});

const move = (x: number, y: number, pointerId = 1): DraggableEvent => ({
  type: LIFECYCLE_MOVE,
  pointerId,
  point: { x, y },
  bounds: null,
});

const release = (x: number, y: number, pointerId = 1): DraggableEvent => ({
  type: LIFECYCLE_RELEASE,
  pointerId,
  point: { x, y },
  bounds: null,
});

const activationReady = (operationId = 1): DraggableEvent => ({
  type: LIFECYCLE_ACTIVATION_READY,
  operationId,
  candidate: CANDIDATE,
});

const startSucceeded = (operationId = 1): DraggableEvent => ({
  type: LIFECYCLE_START_SUCCEEDED,
  operationId,
});

const resolutionStarted = (
  resolutionId: number,
  operationId = 1,
): DraggableEvent => ({
  type: RESOLUTION_STARTED,
  operationId,
  resolutionId,
});

/** The resolution id the drop slice is currently awaiting, or 0. */
const awaitedResolution = (state: DraggableState): number =>
  state.drop.stage === DROP_AWAITING_CONSUMER ? state.drop.resolutionId : 0;

/** Drives a fresh operation all the way to `dragging`. */
function dragging(run: ReturnType<typeof harness>['run']): DraggableState {
  return run(
    INITIAL_DRAGGABLE_STATE,
    admit(),
    move(0, 20),
    activationReady(),
    startSucceeded(),
  );
}

describe('draggable reducer: admission and activation', () => {
  it('should arm a pending operation on admit', () => {
    const { run } = harness();
    const state = run(INITIAL_DRAGGABLE_STATE, admit());

    expect(state.phase).toBe(PHASE_PENDING);
    expect(state.operation?.operationId).toBe(1);
    expect(state.pointer?.id).toBe(1);
  });

  it('should stay pending while movement is under the threshold', () => {
    const { run } = harness();
    const state = run(INITIAL_DRAGGABLE_STATE, admit(), move(3, 4));

    expect(state.phase).toBe(PHASE_PENDING);
  });

  it('should return the same state for a sub-threshold move', () => {
    const { reduce, run } = harness();
    const pending = run(INITIAL_DRAGGABLE_STATE, admit());

    // A pending move changes nothing observable: it must return `from` by
    // reference so the session skips effect routing and no pointer state churns.
    expect(reduce(pending, move(3, 4))).toBe(pending);
  });

  it('should activate once movement reaches the threshold', () => {
    const { run } = harness();
    const state = run(INITIAL_DRAGGABLE_STATE, admit(), move(8, 0));

    expect(state.phase).toBe(PHASE_ACTIVATING);
  });

  it('should stay activating when the candidate is committed', () => {
    const { run } = harness();
    const state = run(
      INITIAL_DRAGGABLE_STATE,
      admit(),
      move(0, 20),
      activationReady(),
    );

    // Acquisition succeeded, but only `start-succeeded` makes the operation
    // eligible for cancel/finish semantics.
    expect(state.phase).toBe(PHASE_ACTIVATING);
  });

  it('should reach dragging only after start succeeds', () => {
    const { run } = harness();

    expect(dragging(run).phase).toBe(PHASE_DRAGGING);
  });

  it('should return to idle when activation fails', () => {
    const { run } = harness();
    const state = run(INITIAL_DRAGGABLE_STATE, admit(), move(0, 20), {
      type: LIFECYCLE_ACTIVATION_FAILED,
      operationId: 1,
    });

    expect(state.phase).toBe(PHASE_IDLE);
    expect(state.operation).toBeNull();
  });

  it('should ignore a second admit while an operation is already armed', () => {
    const { run } = harness();
    const state = run(INITIAL_DRAGGABLE_STATE, admit(1), admit(2));

    expect(state.operation?.operationId).toBe(1);
  });
});

describe('draggable reducer: disarm', () => {
  // The regression this suite exists for: a click must not leave the operation
  // armed, or the next button-less move activates a drag.
  it('should disarm a pending operation when the pointer is released', () => {
    const { run } = harness();
    const state = run(INITIAL_DRAGGABLE_STATE, admit(), release(1, 1));

    expect(state.phase).toBe(PHASE_IDLE);
    expect(state.operation).toBeNull();
    expect(state.pointer).toBeNull();
  });

  it('should not activate on a move after a pending release', () => {
    const { run } = harness();
    const state = run(
      INITIAL_DRAGGABLE_STATE,
      admit(),
      release(1, 1),
      move(0, 500),
    );

    expect(state.phase).toBe(PHASE_IDLE);
  });

  it('should disarm a pending operation on cancel without settling', () => {
    const { run } = harness();
    const state = run(INITIAL_DRAGGABLE_STATE, admit(), {
      type: LIFECYCLE_CANCEL,
      reason: { type: CANCEL_ESCAPE },
    });

    expect(state.phase).toBe(PHASE_IDLE);
    expect(state.settlement).toBeNull();
  });
});

describe('draggable reducer: currency', () => {
  it('should ignore a move from a foreign pointer', () => {
    const { reduce, run } = harness();
    const armed = run(INITIAL_DRAGGABLE_STATE, admit(1, 1));

    expect(reduce(armed, move(0, 500, 99))).toBe(armed);
  });

  it('should ignore a release from a foreign pointer', () => {
    const { reduce, run } = harness();
    const armed = run(INITIAL_DRAGGABLE_STATE, admit(1, 1));

    expect(reduce(armed, release(0, 0, 99))).toBe(armed);
  });

  it('should ignore activation-ready for a superseded operation', () => {
    const { reduce, run } = harness();
    const activating = run(INITIAL_DRAGGABLE_STATE, admit(1), move(0, 20));

    expect(reduce(activating, activationReady(42))).toBe(activating);
  });

  it('should ignore start-succeeded for a superseded operation', () => {
    const { reduce, run } = harness();
    const ready = run(
      INITIAL_DRAGGABLE_STATE,
      admit(1),
      move(0, 20),
      activationReady(1),
    );

    expect(reduce(ready, startSucceeded(42))).toBe(ready);
  });

  it('should ignore a drop resolution carrying a stale resolution id', () => {
    const { reduce, run } = harness();
    const awaiting = run(dragging(run), release(0, 40), resolutionStarted(7));
    expect(awaiting.phase).toBe(PHASE_AWAITING_RESULT);

    const stale = reduce(awaiting, {
      type: DROP_RESOLVED,
      operationId: 1,
      resolutionId: 999,
      resolution: FreeDropResolution.accept(),
    });

    expect(stale).toBe(awaiting);
  });

  it('should ignore a drop resolution carrying a stale operation id', () => {
    const { reduce, run } = harness();
    const awaiting = run(dragging(run), release(0, 40), resolutionStarted(7));

    const stale = reduce(awaiting, {
      type: DROP_RESOLVED,
      operationId: 42,
      resolutionId: 7,
      resolution: FreeDropResolution.accept(),
    });

    expect(stale).toBe(awaiting);
  });

  it('should ignore a landing event carrying a stale landing id', () => {
    // A rejection with a home target is the case that actually runs a landing,
    // so it is the one where a foreign landing id must be inert.
    const { reduce, run } = harness(true);
    const awaiting = run(dragging(run), release(0, 40), resolutionStarted(7));
    const settling = reduce(awaiting, {
      type: DROP_RESOLVED,
      operationId: 1,
      resolutionId: awaitedResolution(awaiting),
      resolution: FreeDropResolution.reject('no'),
    });
    expect(settling.settlement?.landing.stage).toBe(LANDING_PREPARING);

    expect(
      reduce(settling, {
        type: LANDING_PINNED,
        operationId: 1,
        landingId: 4242,
      }),
    ).toBe(settling);
  });
});

describe('draggable reducer: realm ownership', () => {
  // Invariant: realm-sensitive platform work goes through `DOMRealm`. The
  // release rect is the only platform object the reducer constructs, and it
  // must come from the controller's own document — an ambient global would
  // hand an iframe consumer a rect from the wrong realm.
  it('should build the release rect with the configured realm constructor', () => {
    const { run } = harness();
    const awaiting = run(dragging(run), release(0, 40));

    expect(awaiting.drop.stage).toBe(DROP_PROPOSAL_READY);
    const { proposal } = awaiting.drop as {
      proposal: { request: { visualRect: unknown } };
    };
    expect(proposal.request.visualRect).toBeInstanceOf(
      REALM.window.DOMRectReadOnly,
    );
  });

  it('should not touch the ambient rect constructor', () => {
    // If the reducer reached for the global, this run would throw in the node
    // environment, where no `DOMRectReadOnly` exists.
    const { run } = harness();

    expect(globalThis.DOMRectReadOnly).toBeUndefined();
    expect(() => run(dragging(run), release(0, 40))).not.toThrow();
  });
});

describe('draggable reducer: no-effect guard', () => {
  // The session relies on reference equality to skip effects, so an event that
  // changes nothing must return the very same state object.
  it('should return the identical state for an event it ignores', () => {
    const { reduce } = harness();

    expect(reduce(INITIAL_DRAGGABLE_STATE, move(10, 10))).toBe(
      INITIAL_DRAGGABLE_STATE,
    );
  });

  it('should return the identical state for a release with nothing armed', () => {
    const { reduce } = harness();

    expect(reduce(INITIAL_DRAGGABLE_STATE, release(10, 10))).toBe(
      INITIAL_DRAGGABLE_STATE,
    );
  });
});

describe('draggable reducer: motion', () => {
  it('should record the committed viewport delta while dragging', () => {
    const { run } = harness();
    const state = run(dragging(run), move(30, 40));

    expect(state.motion?.viewportDelta).toEqual({ x: 30, y: 40 });
  });

  it('should let release coordinates override the last move', () => {
    const { run } = harness();
    const state = run(dragging(run), move(30, 40), release(100, 120));

    expect(state.motion?.viewportDelta).toEqual({ x: 100, y: 120 });
  });

  it('should apply the configured axis constraint to pointer movement', () => {
    const { run } = harness();
    const constrained = run(
      dragging(run),
      { type: SET_POLICY, axis: AXIS_X },
      move(30, 40),
    );

    expect(constrained.motion?.viewportDelta).toEqual({ x: 30, y: 0 });
  });

  it('should clamp pointer movement to the supplied bounds', () => {
    const { run } = harness();
    const bounds = {
      left: 0,
      top: 0,
      right: 60,
      bottom: 60,
      width: 60,
      height: 60,
    } as DOMRectReadOnly;
    const state = run(dragging(run), {
      type: LIFECYCLE_MOVE,
      pointerId: 1,
      point: { x: 500, y: 500 },
      bounds,
    });

    // The visual is 50x50 at the origin, so it may travel 10px before its far
    // edge reaches the bounds.
    expect(state.motion?.viewportDelta).toEqual({ x: 10, y: 10 });
  });
});

describe('draggable reducer: settlement barrier', () => {
  /** Drives to settling with an accepted drop, optionally acknowledged. */
  function settled(
    run: ReturnType<typeof harness>['run'],
    reduce: ReturnType<typeof harness>['reduce'],
    presentationReady?: PromiseLike<void>,
  ): DraggableState {
    const awaiting = run(dragging(run), release(0, 40), resolutionStarted(7));
    return reduce(awaiting, {
      type: DROP_RESOLVED,
      operationId: 1,
      resolutionId: awaitedResolution(awaiting),
      resolution: presentationReady
        ? FreeDropResolution.accept(presentationReady)
        : FreeDropResolution.accept(),
    });
  }

  it('should settle an accepted drop immediately when nothing was acknowledged', () => {
    const { reduce, run } = harness();
    const state = settled(run, reduce);

    expect(state.settlement?.presentation).toBe(PRESENTATION_READY);
    expect(state.settlement?.outcome.result).toBe(OUTCOME_ACCEPTED);
  });

  it('should hold the presentation pending when the resolution carries a promise', () => {
    const { reduce, run } = harness();
    const state = settled(run, reduce, new Promise<void>(() => {}));

    expect(state.settlement?.presentation).toBe(PRESENTATION_PENDING);
    expect(state.phase).toBe(PHASE_SETTLING);
  });

  it('should complete the operation once the acknowledgement settles', () => {
    const { reduce, run } = harness();
    const pending = settled(run, reduce, new Promise<void>(() => {}));
    const acknowledged = reduce(pending, {
      type: PRESENTATION_SETTLED,
      operationId: 1,
      resolutionId: 7,
      error: null,
    });

    // Landing was already skipped, so the acknowledgement is the last barrier:
    // satisfying it releases the temporary presentation and ends the operation.
    expect(pending.phase).toBe(PHASE_SETTLING);
    expect(acknowledged.phase).toBe(PHASE_IDLE);
    expect(acknowledged.settlement).toBeNull();
  });

  it('should skip landing for an accepted free drop, which restores immediately', () => {
    const { reduce, run } = harness();
    const state = settled(run, reduce);

    expect(state.settlement?.landing.stage).toBe(LANDING_SKIPPED);
  });

  it('should prepare a home landing for a rejected drop when a home target exists', () => {
    const { reduce, run } = harness(true);
    const awaiting = run(dragging(run), release(0, 40), resolutionStarted(7));
    const state = reduce(awaiting, {
      type: DROP_RESOLVED,
      operationId: 1,
      resolutionId: awaitedResolution(awaiting),
      resolution: FreeDropResolution.reject('no'),
    });

    expect(state.settlement?.landing.stage).toBe(LANDING_PREPARING);
  });

  it('should restore immediately for a rejected drop with no home target', () => {
    const { reduce, run } = harness(false);
    const awaiting = run(dragging(run), release(0, 40), resolutionStarted(7));
    const state = reduce(awaiting, {
      type: DROP_RESOLVED,
      operationId: 1,
      resolutionId: awaitedResolution(awaiting),
      resolution: FreeDropResolution.reject('no'),
    });

    expect(state.settlement?.landing.stage).toBe(LANDING_SKIPPED);
  });

  it('should hold settlement open until a pending acknowledgement resolves', () => {
    const { reduce, run } = harness();
    const pending = settled(run, reduce, new Promise<void>(() => {}));

    // Landing is already skipped, so readiness is the only remaining barrier:
    // the operation must not reach idle while it is still pending.
    expect(pending.settlement?.landing.stage).toBe(LANDING_SKIPPED);
    expect(pending.phase).toBe(PHASE_SETTLING);
  });
});
