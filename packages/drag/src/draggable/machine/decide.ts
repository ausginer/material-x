import { decideAcquiring, decideStarting } from './activating.ts';
import { decideActive } from './active.ts';
import type { DraggableDecision, DraggableMachineConfig } from './effect.ts';
import { POLICY_UPDATED, type DraggableEvent } from './event.ts';
import { decideFinalizing } from './finalizing.ts';
import { decideIdle } from './idle.ts';
import { decidePending } from './pending.ts';
import { decideReporting } from './reporting.ts';
import { decideAwaitingConsumer, decideResolvingRelease } from './resolving.ts';
import { decideSettling } from './settling.ts';
import {
  DRAG_ACQUIRING,
  DRAG_AWAITING_CONSUMER,
  DRAG_FINALIZING,
  DRAG_IDLE,
  DRAG_PENDING,
  DRAG_PENDING_ARMING,
  DRAG_REPORTING_FAILURE,
  DRAG_RESOLVING_RELEASE,
  DRAG_SETTLING,
  DRAG_STARTING,
  DRAGGING,
  type DraggablePolicy,
  type DraggableState,
} from './state.ts';

function assertNever(value: never): never {
  throw new Error(`Unexpected draggable lifecycle: ${String(value)}`);
}

export function createInitialDraggableState(
  policy: DraggablePolicy,
): DraggableState {
  return {
    policy,
    nextOperationId: 1,
    phase: DRAG_IDLE,
  };
}

export function createDraggableMachine(
  config: DraggableMachineConfig,
): (state: DraggableState, event: DraggableEvent) => DraggableDecision {
  return (state, event) => {
    if (event.type === POLICY_UPDATED) {
      return {
        state: { ...state, policy: event.policy },
        effects: null,
      };
    }

    switch (state.phase) {
      case DRAG_IDLE:
        return decideIdle(state, event);

      case DRAG_PENDING_ARMING:
      case DRAG_PENDING:
        return decidePending(state, event, config);

      case DRAG_ACQUIRING:
        return decideAcquiring(state, event, config);

      case DRAG_STARTING:
        return decideStarting(state, event, config);

      case DRAGGING:
        return decideActive(state, event, config);

      case DRAG_RESOLVING_RELEASE:
        return decideResolvingRelease(state, event, config);

      case DRAG_AWAITING_CONSUMER:
        return decideAwaitingConsumer(state, event, config);

      case DRAG_SETTLING:
        return decideSettling(state, event, config);

      case DRAG_REPORTING_FAILURE:
        return decideReporting(state, event, config);

      case DRAG_FINALIZING:
        return decideFinalizing(state, event, config);

      default:
        return assertNever(state);
    }
  };
}
