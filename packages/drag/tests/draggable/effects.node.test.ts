import { describe, expect, it, vi } from 'vitest';
import { createDropResolutionOwner } from '../../src/draggable/effects/resolution.ts';
import {
  DROP_RESOLVED,
  type DraggableEvent,
} from '../../src/draggable/machine/event.ts';
import {
  OPEN_DROP_RESOLUTION,
  type OpenDropResolutionEffect,
} from '../../src/draggable/machine/effect.ts';
import { FreeDropResolution } from '../../src/draggable/options.ts';
import type { OperationInputOwner } from '../../src/draggable/effects/operation.ts';

function operationOwner(
  current: (operationId: number) => boolean,
): OperationInputOwner {
  return {
    begin: vi.fn(),
    current: ({ operationId }) => current(operationId),
    signal: () => new AbortController().signal,
    useInteraction: vi.fn(),
    usePresentation: vi.fn(),
    stop: vi.fn(),
    releasePresentation: vi.fn(),
    failMechanical: vi.fn(),
    retire: vi.fn(),
    destroy: vi.fn(),
  };
}

function resolutionEffect(
  callback: OpenDropResolutionEffect['callback'],
): OpenDropResolutionEffect {
  return {
    type: OPEN_DROP_RESOLUTION,
    operationId: 1,
    resolutionId: 1,
    request: {
      // oxlint-disable-next-line typescript/consistent-type-assertions
      item: {} as HTMLElement,
      // oxlint-disable-next-line typescript/consistent-type-assertions
      visual: {} as HTMLElement,
      pointer: { x: 0, y: 0 },
      viewportPosition: { x: 0, y: 0 },
      localPosition: { x: 0, y: 0 },
      viewportDelta: { x: 0, y: 0 },
      localDelta: { x: 0, y: 0 },
      // oxlint-disable-next-line typescript/consistent-type-assertions
      visualRect: {} as DOMRectReadOnly,
    },
    callback,
  };
}

describe('DropResolutionOwner', () => {
  it('should invoke the consumer callback synchronously', () => {
    const order: string[] = [];
    const owner = createDropResolutionOwner(
      operationOwner(() => true),
      () => {
        order.push('result');
      },
    );

    owner.open(
      resolutionEffect(() => {
        order.push('callback');
        return FreeDropResolution.accept();
      }),
    );

    expect(order).toEqual(['callback']);
  });

  it('should reject stale currency before inspecting the result payload', async () => {
    let active = true;
    let resolve: (value: FreeDropResolution) => void = () => {};
    const payload = new Proxy(
      {},
      {
        get() {
          throw new Error('stale payload inspected');
        },
      },
    );
    const events: DraggableEvent[] = [];
    const owner = createDropResolutionOwner(
      operationOwner(() => active),
      (event) => {
        events.push(event);
      },
    );

    owner.open(
      resolutionEffect(
        () =>
          new Promise((resolvePromise) => {
            resolve = resolvePromise;
          }),
      ),
    );
    active = false;
    // oxlint-disable-next-line typescript/consistent-type-assertions
    resolve(payload as FreeDropResolution);
    await Promise.resolve();

    expect(events).toEqual([]);
  });

  it('should dispatch a currency-tagged accepted result', async () => {
    const events: DraggableEvent[] = [];
    const owner = createDropResolutionOwner(
      operationOwner(() => true),
      (event) => {
        events.push(event);
      },
    );

    owner.open(resolutionEffect(() => FreeDropResolution.accept()));
    await Promise.resolve();

    expect(events).toEqual([
      {
        type: DROP_RESOLVED,
        operationId: 1,
        resolutionId: 1,
        resolution: FreeDropResolution.accept(),
      },
    ]);
  });
});
