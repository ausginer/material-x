import { describe, expect, it, vi } from 'vitest';
import {
  ACQUIRE_FREE_ACTIVATION,
  ACTIVATION_READY,
  ADMIT_POINTER,
  BEGIN_POINTER_OPERATION,
  CONTROLLED_POSITION,
  CONTROLLED_POSITION_RESOLVED,
  createDraggableMachine,
  createInitialDraggableState,
  DRAG_AWAITING_CONSUMER,
  DRAG_FINALIZING,
  DRAG_IDLE,
  DRAG_PENDING,
  DRAG_REPORTING_FAILURE,
  DRAG_SETTLING,
  DRAG_STARTING,
  DRAGGING,
  DROP_RESOLVED,
  DROP_RESOLUTION_FAILED,
  FAILURE_REPORTED,
  FINALIZATION_COMPLETED,
  FINALIZATION_FAILED,
  FINALIZE_OPERATION,
  INTERACTION_STOPPED,
  INVOKE_MOVE,
  INVOKE_START,
  MOTION_OBSERVED,
  OBSERVE_CONTROLLED_POSITION,
  OBSERVE_FREE_MOTION,
  OPEN_DROP_RESOLUTION,
  OPERATION_ARMED,
  OPERATION_CANCELED,
  POINTER_MOVED,
  POINTER_RELEASED,
  POLICY_UPDATED,
  PRESENT_MOTION,
  PRESENTATION_SETTLED,
  RELEASE_RESOLVED,
  REPORT_FAILURE,
  RESOLVE_FREE_RELEASE,
  RETIRE_OPERATION,
  START_SUCCEEDED,
  STOP_INTERACTION,
  type DraggableEffect,
  type DraggableEvent,
  type DraggablePolicy,
  type DraggableState,
} from '../../src/draggable/machine.ts';
import { FreeDropResolution } from '../../src/draggable/options.ts';
import {
  CANCEL_CONSUMER,
  FAILURE_DROP_RESOLUTION,
  FAILURE_FINISH_CALLBACK,
} from '../../src/kernel/protocol.ts';
import type { CoordinateMapper } from '../../src/kernel/types.ts';

const item = {} as HTMLElement;
const visual = {} as HTMLElement;
const rect = {
  left: 10,
  top: 20,
  right: 110,
  bottom: 120,
  width: 100,
  height: 100,
  x: 10,
  y: 20,
  toJSON: () => ({}),
} as DOMRectReadOnly;

const mapper: CoordinateMapper = {
  toViewport: (point) => point,
  fromViewport: (point) => point,
  deltaFromViewport: (point) => point,
};

function policy(onMove?: DraggablePolicy['onMove']): DraggablePolicy {
  return {
    axis: 'both',
    bounds: undefined,
    boundsVersion: 0,
    coordinateSpace: mapper,
    landingTiming: undefined,
    onMove,
  };
}

function harness(onMove?: DraggablePolicy['onMove']): Readonly<{
  decide: ReturnType<typeof createDraggableMachine>;
  initial: DraggableState;
}> {
  return {
    decide: createDraggableMachine({
      threshold: 8,
      hasHomeTarget: false,
      resolveHomeTarget: undefined,
      onStart: undefined,
      onDrop: vi.fn(() => FreeDropResolution.accept()),
      onFinish: undefined,
      onCancel: undefined,
      onError: undefined,
    }),
    initial: createInitialDraggableState(policy(onMove)),
  };
}

function decide(
  state: DraggableState,
  event: DraggableEvent,
  onMove?: DraggablePolicy['onMove'],
) {
  return harness(onMove).decide(state, event);
}

function admitted(): DraggableState {
  const { decide: decide_, initial } = harness();
  const admitted_ = decide_(initial, {
    type: ADMIT_POINTER,
    item,
    visual,
    pointerId: 1,
    point: { x: 0, y: 0 },
  }).state;
  return decide_(admitted_, {
    type: OPERATION_ARMED,
    operationId: 1,
  }).state;
}

function starting(): DraggableState {
  const { decide: decide_ } = harness();
  const acquiring = decide_(admitted(), {
    type: POINTER_MOVED,
    pointerId: 1,
    point: { x: 8, y: 10 },
  }).state;
  return decide_(acquiring, {
    type: ACTIVATION_READY,
    operationId: 1,
    candidate: { originRect: rect, coordinateSpace: mapper },
  }).state;
}

function dragging(onMove?: DraggablePolicy['onMove']): DraggableState {
  const state = starting();
  const withPolicy = onMove ? { ...state, policy: policy(onMove) } : state;
  return decide(withPolicy, {
    type: START_SUCCEEDED,
    operationId: 1,
  }).state;
}

function awaitingConsumer(): DraggableState {
  const release = decide(dragging(), {
    type: POINTER_RELEASED,
    pointerId: 1,
    point: { x: 40, y: 50 },
  });
  return decide(release.state, {
    type: RELEASE_RESOLVED,
    operationId: 1,
    motionId: 1,
    viewportDelta: { x: 40, y: 50 },
    proposal: {
      request: {
        item,
        visual,
        pointer: { x: 40, y: 50 },
        viewportPosition: { x: 30, y: 30 },
        localPosition: { x: 30, y: 30 },
        viewportDelta: { x: 40, y: 50 },
        localDelta: { x: 40, y: 50 },
        visualRect: rect,
      },
      coordinateSpace: mapper,
    },
  }).state;
}

describe('decideDraggable admission', () => {
  it('should allocate operation identity and begin pointer input', () => {
    const { decide: decide_, initial } = harness();
    const decision = decide_(initial, {
      type: ADMIT_POINTER,
      item,
      visual,
      pointerId: 7,
      point: { x: 2, y: 3 },
    });

    expect(decision.state.nextOperationId).toBe(2);
    expect(decision.effects).toEqual({
      type: BEGIN_POINTER_OPERATION,
      operationId: 1,
      pointerId: 7,
    });
  });

  it('should return identical state for an ignored event', () => {
    const state = admitted();
    const decision = decide(state, {
      type: POINTER_MOVED,
      pointerId: 2,
      point: { x: 20, y: 20 },
    });

    expect(decision.state).toBe(state);
    expect(decision.effects).toBeNull();
  });

  it('should stay identical below the activation threshold', () => {
    const state = admitted();
    const decision = decide(state, {
      type: POINTER_MOVED,
      pointerId: 1,
      point: { x: 7, y: 7 },
    });

    expect(decision.state).toBe(state);
    expect(decision.effects).toBeNull();
  });

  it('should acquire activation after crossing the threshold', () => {
    const decision = decide(admitted(), {
      type: POINTER_MOVED,
      pointerId: 1,
      point: { x: 8, y: 7 },
    });

    expect(decision.effects).toMatchObject({
      type: ACQUIRE_FREE_ACTIVATION,
      operationId: 1,
      latestPointer: { x: 8, y: 7 },
    });
  });
});

describe('decideDraggable activation', () => {
  it('should commit the candidate before invoking start', () => {
    const state = starting();

    expect(state.phase).toBe(DRAG_STARTING);
    expect(state.phase === DRAG_STARTING && state.operation.originRect).toBe(
      rect,
    );
  });

  it('should emit the start callback from the candidate decision', () => {
    const { decide: decide_ } = harness();
    const acquiring = decide_(admitted(), {
      type: POINTER_MOVED,
      pointerId: 1,
      point: { x: 8, y: 10 },
    }).state;
    const decision = decide_(acquiring, {
      type: ACTIVATION_READY,
      operationId: 1,
      candidate: { originRect: rect, coordinateSpace: mapper },
    });

    expect(decision.effects).toMatchObject({
      type: INVOKE_START,
      operationId: 1,
      geometry: { viewportDelta: { x: 8, y: 10 } },
    });
  });

  it('should let callback cancellation win before start success', () => {
    const state = starting();
    const canceled = decide(state, {
      type: OPERATION_CANCELED,
      reason: { type: CANCEL_CONSUMER },
    });
    const staleSuccess = decide(canceled.state, {
      type: START_SUCCEEDED,
      operationId: 1,
    });

    expect(canceled.effects).toEqual([
      { type: STOP_INTERACTION, operationId: 1 },
    ]);
    expect(staleSuccess.state).toBe(canceled.state);
  });
});

describe('decideDraggable motion', () => {
  it('should update policy without changing the active lifecycle', () => {
    const state = dragging();
    const nextPolicy = { ...policy(), axis: 'x' as const };
    const decision = decide(state, {
      type: POLICY_UPDATED,
      policy: nextPolicy,
    });

    expect(decision.state.phase).toBe(state.phase);
    expect(decision.state.policy).toBe(nextPolicy);
    expect(decision.effects).toBeNull();
  });

  it('should observe bounds before committing pointer motion', () => {
    const decision = decide(dragging(), {
      type: POINTER_MOVED,
      pointerId: 1,
      point: { x: 20, y: 30 },
    });

    expect(decision.effects).toMatchObject({
      type: OBSERVE_FREE_MOTION,
      operationId: 1,
      motionId: 1,
    });
  });

  it('should present before invoking move', () => {
    const callback = vi.fn();
    const pending = decide(dragging(callback), {
      type: POINTER_MOVED,
      pointerId: 1,
      point: { x: 20, y: 30 },
    }).state;
    const decision = decide(pending, {
      type: MOTION_OBSERVED,
      operationId: 1,
      motionId: 1,
      bounds: null,
    });

    expect(decision.effects).toEqual([
      expect.objectContaining({ type: PRESENT_MOTION }),
      expect.objectContaining({ type: INVOKE_MOVE, callback }),
    ]);
  });

  it('should resolve controlled position without bounds', () => {
    const pending = decide(dragging(), {
      type: CONTROLLED_POSITION,
      position: { x: 300, y: 300 },
    });

    expect(pending.effects).toMatchObject({
      type: OBSERVE_CONTROLLED_POSITION,
      position: { x: 300, y: 300 },
    });

    const committed = decide(pending.state, {
      type: CONTROLLED_POSITION_RESOLVED,
      operationId: 1,
      motionId: 1,
      viewportDelta: { x: 290, y: 280 },
    });
    expect(committed.effects).toMatchObject({ type: PRESENT_MOTION });
  });
});

describe('decideDraggable settlement and finalization', () => {
  it('should finalize only after interaction stops', () => {
    const settling = decide(awaitingConsumer(), {
      type: DROP_RESOLVED,
      operationId: 1,
      resolutionId: 1,
      resolution: FreeDropResolution.accept(),
    });

    expect(settling.state.phase).toBe(DRAG_SETTLING);
    expect(settling.effects).toEqual([
      { type: STOP_INTERACTION, operationId: 1 },
    ]);

    const finalizing = decide(settling.state, {
      type: INTERACTION_STOPPED,
      operationId: 1,
    });

    expect(finalizing.state.phase).toBe(DRAG_FINALIZING);
    expect(finalizing.effects).toMatchObject({
      type: FINALIZE_OPERATION,
      operationId: 1,
    });
  });

  it('should ignore stale presentation settlement currency', () => {
    const settling = decide(awaitingConsumer(), {
      type: DROP_RESOLVED,
      operationId: 1,
      resolutionId: 1,
      resolution: FreeDropResolution.accept(Promise.resolve()),
    }).state;
    const decision = decide(settling, {
      type: PRESENTATION_SETTLED,
      operationId: 1,
      resolutionId: 99,
      error: null,
    });

    expect(decision.state).toBe(settling);
    expect(decision.effects).toBeNull();
  });

  it('should retire after successful finalization', () => {
    const settling = decide(awaitingConsumer(), {
      type: DROP_RESOLVED,
      operationId: 1,
      resolutionId: 1,
      resolution: FreeDropResolution.accept(),
    }).state;
    const finalizing = decide(settling, {
      type: INTERACTION_STOPPED,
      operationId: 1,
    }).state;
    const decision = decide(finalizing, {
      type: FINALIZATION_COMPLETED,
      operationId: 1,
    });

    expect(decision.state.phase).toBe(DRAG_IDLE);
    expect(decision.effects).toEqual({
      type: RETIRE_OPERATION,
      operationId: 1,
    });
  });

  it('should report a failed finish callback before retirement', () => {
    const settling = decide(awaitingConsumer(), {
      type: DROP_RESOLVED,
      operationId: 1,
      resolutionId: 1,
      resolution: FreeDropResolution.accept(),
    }).state;
    const finalizing = decide(settling, {
      type: INTERACTION_STOPPED,
      operationId: 1,
    }).state;
    const failure = new Error('finish failed');
    const decision = decide(finalizing, {
      type: FINALIZATION_FAILED,
      operationId: 1,
      error: failure,
    });

    expect(decision.state.phase).toBe(DRAG_REPORTING_FAILURE);
    expect(decision.effects).toMatchObject({
      type: REPORT_FAILURE,
      cause: { stage: FAILURE_FINISH_CALLBACK },
      error: failure,
    });
  });
});

describe('decideDraggable release and failure', () => {
  it('should resolve the true release point before opening onDrop', () => {
    const resolving = decide(dragging(), {
      type: POINTER_RELEASED,
      pointerId: 1,
      point: { x: 40, y: 50 },
    });

    expect(resolving.effects).toMatchObject({
      type: RESOLVE_FREE_RELEASE,
      point: { x: 40, y: 50 },
    });

    const proposal = {
      request: {
        item,
        visual,
        pointer: { x: 40, y: 50 },
        viewportPosition: { x: 30, y: 30 },
        localPosition: { x: 30, y: 30 },
        viewportDelta: { x: 40, y: 50 },
        localDelta: { x: 40, y: 50 },
        visualRect: rect,
      },
      coordinateSpace: mapper,
    };
    const decision = decide(resolving.state, {
      type: RELEASE_RESOLVED,
      operationId: 1,
      motionId: 1,
      viewportDelta: { x: 40, y: 50 },
      proposal,
    });

    expect(decision.state.phase).toBe(DRAG_AWAITING_CONSUMER);
    expect(decision.effects).toEqual([
      expect.objectContaining({ type: PRESENT_MOTION }),
      expect.objectContaining({
        type: OPEN_DROP_RESOLUTION,
        request: proposal.request,
      }),
    ]);
  });

  it('should commit reporting state before reporting a resolver failure', () => {
    const release = decide(dragging(), {
      type: POINTER_RELEASED,
      pointerId: 1,
      point: { x: 40, y: 50 },
    });
    const proposal = {
      request: {
        item,
        visual,
        pointer: { x: 40, y: 50 },
        viewportPosition: { x: 30, y: 30 },
        localPosition: { x: 30, y: 30 },
        viewportDelta: { x: 40, y: 50 },
        localDelta: { x: 40, y: 50 },
        visualRect: rect,
      },
      coordinateSpace: mapper,
    };
    const awaiting = decide(release.state, {
      type: RELEASE_RESOLVED,
      operationId: 1,
      motionId: 1,
      viewportDelta: { x: 40, y: 50 },
      proposal,
    }).state;
    const failure = new Error('drop failed');
    const decision = decide(awaiting, {
      type: DROP_RESOLUTION_FAILED,
      operationId: 1,
      resolutionId: 1,
      error: failure,
    });

    expect(decision.state.phase).toBe(DRAG_REPORTING_FAILURE);
    expect(decision.effects).toEqual({
      type: REPORT_FAILURE,
      operationId: 1,
      cause: { stage: FAILURE_DROP_RESOLUTION },
      error: failure,
      domain: null,
      callback: undefined,
    });
  });

  it('should ignore a stale failure acknowledgement', () => {
    const state = admitted();
    const decision = decide(state, {
      type: FAILURE_REPORTED,
      operationId: 99,
    });

    expect(decision.state).toBe(state);
  });

  it('should replay equivalent decisions from equivalent input', () => {
    const state = dragging();
    const event: DraggableEvent = {
      type: POINTER_MOVED,
      pointerId: 1,
      point: { x: 20, y: 30 },
    };

    expect(decide(state, event)).toEqual(decide(state, event));
  });
});

describe('draggable lifecycle constants', () => {
  it('should expose the armed pending phase for diagnostics', () => {
    expect(admitted().phase).toBe(DRAG_PENDING);
  });

  it('should expose the active phase after start succeeds', () => {
    expect(dragging().phase).toBe(DRAGGING);
  });
});
