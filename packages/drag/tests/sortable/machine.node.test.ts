import { describe, expect, it, vi } from 'vitest';
import {
  CANCEL_ESCAPE,
  FAILURE_PLACEHOLDER_TARGET,
  FAILURE_RENDERER_WRITE,
} from '../../src/kernel/protocol.ts';
import {
  ACTIVATION_READY,
  ADMIT_KEYBOARD,
  ADMIT_POINTER,
  MOTION_PRESENTATION_FAILED,
  OPERATION_ARMED,
  OPERATION_CANCELED,
  PLACEHOLDER_WRITE_FAILED,
  POINTER_MOVED,
  PROPOSAL_INSERTION_RESOLVED,
  SORTABLE_ACTIVATING,
  SORTABLE_ACTIVE,
  SORTABLE_IDLE,
  SORTABLE_PENDING,
  SORTABLE_REPORTING,
  SORTABLE_RESOLVING,
  SORTABLE_SPATIAL,
  START_SUCCEEDED,
  createInitialSortableState,
  createSortableMachine,
  type SortableEvent,
  type SortableState,
} from '../../src/sortable/machine.ts';
import type {
  CollectionSnapshot,
  Insertion,
} from '../../src/sortable/options.ts';

function element(): HTMLElement {
  // oxlint-disable-next-line typescript/consistent-type-assertions
  return { nodeType: 1 } as HTMLElement;
}

const A = element();
const B = element();
const C = element();
const SNAPSHOT: CollectionSnapshot = { items: [A, B, C], version: 1 };
const INSERTION: Insertion = {
  version: 1,
  index: 1,
  before: B,
  after: C,
};

function harness(): {
  decide: ReturnType<typeof createSortableMachine>;
  run(state: SortableState, ...events: readonly SortableEvent[]): SortableState;
} {
  const decide = createSortableMachine({
    threshold: 8,
    onStart: undefined,
    onReorder: vi.fn(),
    onFinish: undefined,
    onCancel: undefined,
    onError: undefined,
    landingTiming: undefined,
  });
  return {
    decide,
    run: (state, ...events) =>
      events.reduce((current, event) => decide(current, event).state, state),
  };
}

function pointerAdmission(): SortableEvent {
  return {
    type: ADMIT_POINTER,
    item: A,
    visual: A,
    pointerId: 7,
    point: { x: 0, y: 0 },
    snapshot: SNAPSHOT,
  };
}

function keyboardSpatial(
  run: ReturnType<typeof harness>['run'],
): SortableState {
  return run(
    createInitialSortableState(),
    {
      type: ADMIT_KEYBOARD,
      item: A,
      visual: A,
      insertion: INSERTION,
      point: { x: 0, y: 0 },
      snapshot: SNAPSHOT,
    },
    { type: OPERATION_ARMED, operationId: 1 },
    {
      type: ACTIVATION_READY,
      operationId: 1,
      activationVersion: 1,
      activationIndex: 0,
      insertion: INSERTION,
    },
    { type: START_SUCCEEDED, operationId: 1 },
  );
}

describe('createSortableMachine', () => {
  it('should allocate operation identity in state', () => {
    const { decide } = harness();
    const next = decide(createInitialSortableState(), pointerAdmission()).state;

    expect(next.phase).toBe(SORTABLE_PENDING);
    expect(next.nextOperationId).toBe(2);
    expect('operation' in next && next.operation.operationId).toBe(1);
  });

  it('should activate only after pointer threshold is crossed', () => {
    const { run } = harness();
    const pending = run(
      createInitialSortableState(),
      pointerAdmission(),
      { type: OPERATION_ARMED, operationId: 1 },
      {
        type: POINTER_MOVED,
        operationId: 1,
        pointerId: 7,
        point: { x: 7, y: 7 },
      },
    );
    const activating = run(pending, {
      type: POINTER_MOVED,
      operationId: 1,
      pointerId: 7,
      point: { x: 8, y: 0 },
    });

    expect(pending.phase).toBe(SORTABLE_PENDING);
    expect(activating.phase).toBe(SORTABLE_ACTIVATING);
  });

  it('should disarm pending cancellation without a transaction result', () => {
    const { run } = harness();
    const next = run(
      createInitialSortableState(),
      pointerAdmission(),
      { type: OPERATION_ARMED, operationId: 1 },
      { type: OPERATION_CANCELED, reason: { type: CANCEL_ESCAPE } },
    );

    expect(next.phase).toBe(SORTABLE_IDLE);
  });

  it('should preserve the commanded keyboard insertion', () => {
    const { run } = harness();
    const next = keyboardSpatial(run);

    expect(next.phase).toBe(SORTABLE_SPATIAL);
    expect('incumbent' in next && next.incumbent).toBe(INSERTION);
  });

  it('should reject stale spatial currency and allocate resolution currency', () => {
    const { decide, run } = harness();
    const spatial = keyboardSpatial(run);
    expect(spatial.phase).toBe(SORTABLE_SPATIAL);
    if (spatial.phase !== SORTABLE_SPATIAL) {
      return;
    }
    const stale = decide(spatial, {
      type: PROPOSAL_INSERTION_RESOLVED,
      operationId: 1,
      collectionVersion: 1,
      spatialId: spatial.currency.spatialId + 1,
      insertion: INSERTION,
    }).state;
    const current = decide(spatial, {
      type: PROPOSAL_INSERTION_RESOLVED,
      ...spatial.currency,
      insertion: INSERTION,
    }).state;

    expect(stale).toBe(spatial);
    expect(current.phase).toBe(SORTABLE_RESOLVING);
    expect(
      current.phase === SORTABLE_RESOLVING && current.currency.resolutionId,
    ).toBe(1);
  });

  it('should reject stale motion-presentation failure currency', () => {
    const { decide, run } = harness();
    const active = run(
      createInitialSortableState(),
      pointerAdmission(),
      { type: OPERATION_ARMED, operationId: 1 },
      {
        type: POINTER_MOVED,
        operationId: 1,
        pointerId: 7,
        point: { x: 9, y: 0 },
      },
      {
        type: ACTIVATION_READY,
        operationId: 1,
        activationVersion: 1,
        activationIndex: 0,
        insertion: INSERTION,
      },
      { type: START_SUCCEEDED, operationId: 1 },
      {
        type: POINTER_MOVED,
        operationId: 1,
        pointerId: 7,
        point: { x: 20, y: 0 },
      },
    );
    expect(active.phase).toBe(SORTABLE_ACTIVE);
    if (active.phase !== SORTABLE_ACTIVE) {
      return;
    }

    const stale = decide(active, {
      type: MOTION_PRESENTATION_FAILED,
      operationId: 1,
      motionId: active.latestMotion.motionId - 1,
      error: new Error('stale'),
    }).state;
    const current = decide(active, {
      type: MOTION_PRESENTATION_FAILED,
      ...active.latestMotion,
      error: new Error('current'),
    }).state;

    expect(stale).toBe(active);
    expect(current.phase).toBe(SORTABLE_REPORTING);
    expect(current.phase === SORTABLE_REPORTING && current.cause.stage).toBe(
      FAILURE_RENDERER_WRITE,
    );
  });

  it('should route a placeholder write failure through reporting', () => {
    const { decide, run } = harness();
    const active = run(
      createInitialSortableState(),
      pointerAdmission(),
      { type: OPERATION_ARMED, operationId: 1 },
      {
        type: POINTER_MOVED,
        operationId: 1,
        pointerId: 7,
        point: { x: 9, y: 0 },
      },
      {
        type: ACTIVATION_READY,
        operationId: 1,
        activationVersion: 1,
        activationIndex: 0,
        insertion: INSERTION,
      },
      { type: START_SUCCEEDED, operationId: 1 },
    );
    expect(active.phase).toBe(SORTABLE_ACTIVE);
    if (active.phase !== SORTABLE_ACTIVE) {
      return;
    }
    const failed = decide(active, {
      type: PLACEHOLDER_WRITE_FAILED,
      operationId: 1,
      error: new Error('write'),
    }).state;

    expect(failed.phase).toBe(SORTABLE_REPORTING);
    expect(failed.phase === SORTABLE_REPORTING && failed.cause.stage).toBe(
      FAILURE_PLACEHOLDER_TARGET,
    );
  });
});
