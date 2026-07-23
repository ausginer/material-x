import type { Machine } from '../../kernel/session.ts';
import { decideActivating } from './activating.ts';
import { decideActive } from './active.ts';
import type {
  SortableDecision,
  SortableEffect,
  SortableMachineConfig,
} from './effect.ts';
import type { SortableEvent } from './event.ts';
import { decideFinalizing } from './finalizing.ts';
import { decideIdle } from './idle.ts';
import { decidePending } from './pending.ts';
import { decideReporting } from './reporting.ts';
import { decideResolving } from './resolving.ts';
import { decideSettling } from './settling.ts';
import { decideSpatial } from './spatial.ts';
import {
  SORTABLE_ACTIVATING,
  SORTABLE_ACTIVE,
  SORTABLE_FINALIZING,
  SORTABLE_IDLE,
  SORTABLE_PENDING,
  SORTABLE_REPORTING,
  SORTABLE_RESOLVING,
  SORTABLE_SETTLING,
  SORTABLE_SPATIAL,
  type SortableState,
} from './state.ts';

function assertNever(value: never): never {
  throw new Error(
    `drag: unknown sortable phase ${(value as { phase?: unknown }).phase as string}`,
  );
}

export function createInitialSortableState(): SortableState {
  return { phase: SORTABLE_IDLE, nextOperationId: 1 };
}

export function createSortableMachine(
  config: SortableMachineConfig,
): Machine<SortableState, SortableEvent, SortableEffect> {
  return (state, event): SortableDecision => {
    switch (state.phase) {
      case SORTABLE_IDLE:
        return decideIdle(state, event);
      case SORTABLE_PENDING:
        return decidePending(state, event, config);
      case SORTABLE_ACTIVATING:
        return decideActivating(state, event, config);
      case SORTABLE_ACTIVE:
        return decideActive(state, event, config);
      case SORTABLE_SPATIAL:
        return decideSpatial(state, event, config);
      case SORTABLE_RESOLVING:
        return decideResolving(state, event, config);
      case SORTABLE_SETTLING:
        return decideSettling(state, event, config);
      case SORTABLE_REPORTING:
        return decideReporting(state, event, config);
      case SORTABLE_FINALIZING:
        return decideFinalizing(state, event, config);
      default:
        return assertNever(state);
    }
  };
}
