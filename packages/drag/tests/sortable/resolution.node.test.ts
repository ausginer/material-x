import { describe, expect, it, vi } from 'vitest';
import { OUTCOME_ACCEPTED } from '../../src/kernel/protocol.ts';
import { createReorderResolutionOwner } from '../../src/sortable/effects/resolution.ts';
import type { OperationInputOwner } from '../../src/sortable/effects/operation.ts';
import {
  OPEN_REORDER_RESOLUTION,
  REORDER_RESOLVED,
  type OpenReorderResolutionEffect,
} from '../../src/sortable/machine.ts';

function operationOwner(): OperationInputOwner {
  return {
    begin: vi.fn(),
    disarm: vi.fn(),
    current: () => true,
    resources: vi.fn(),
    useInteraction: vi.fn(),
    stop: vi.fn(),
    stopInteraction: vi.fn(),
    releasePresentation: vi.fn(),
    retire: vi.fn(),
    destroy: vi.fn(),
  };
}

function effect(
  callback: OpenReorderResolutionEffect['callback'],
): OpenReorderResolutionEffect {
  const item = {} as HTMLElement;
  return {
    type: OPEN_REORDER_RESOLUTION,
    operationId: 1,
    resolutionId: 2,
    proposal: {
      snapshot: { items: [item], version: 1 },
      request: {
        item,
        version: 1,
        from: 0,
        to: 1,
        before: null,
        after: null,
      },
    },
    callback,
  };
}

describe('createReorderResolutionOwner', () => {
  it('should invoke the consumer callback synchronously', () => {
    const order: string[] = [];
    const owner = createReorderResolutionOwner(operationOwner(), () => {
      order.push('resolved');
    });

    owner.open(
      effect(() => {
        order.push('callback');
        return { type: OUTCOME_ACCEPTED };
      }),
    );
    order.push('after');

    expect(order).toEqual(['callback', 'after']);
  });

  it('should dispatch the normalized result after callback-generated work', async () => {
    const dispatch = vi.fn();
    const owner = createReorderResolutionOwner(operationOwner(), dispatch);

    owner.open(effect(() => ({ type: OUTCOME_ACCEPTED })));

    expect(dispatch).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({
      type: REORDER_RESOLVED,
      operationId: 1,
      resolutionId: 2,
      resolution: { type: OUTCOME_ACCEPTED },
    });
  });
});
