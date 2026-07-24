import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FreeDropResolution,
  type DraggableOptions,
} from '../../src/draggable/options.ts';
import { dispatch } from '../../src/draggable/runtime/actions.ts';
import {
  createDraggableControllerInternal,
  type FreeDragController,
} from '../../src/draggable/runtime/controller.ts';
import type { DragStateFrame } from '../../src/draggable/runtime/frames.ts';
import type { DraggableRuntime } from '../../src/draggable/runtime/runtime.ts';
import { IDLE } from '../../src/kernel/lifecycle.ts';
import { PRESENTATION_READY_TIMEOUT } from '../../src/kernel/presentation-ready.ts';
import {
  FAILURE_PRESENTATION_READY,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
} from '../../src/kernel/protocol.ts';
import type { FreeDropRequest } from '../../src/kernel/types.ts';

const live: FreeDragController[] = [];

function drag(
  item: HTMLElement,
  options: DraggableOptions,
): Readonly<{ controller: FreeDragController; runtime: DraggableRuntime }> {
  const built = createDraggableControllerInternal(item, options);
  live.push(built.controller);
  return built;
}

const accept = (): FreeDropResolution => FreeDropResolution.accept();

/** A void-returning mock, so it matches the callback slots exactly. */
function voidFn(): ReturnType<typeof vi.fn<(...args: unknown[]) => void>> {
  return vi.fn<(...args: unknown[]) => void>();
}

function flush(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function createItem(): HTMLElement {
  const item = document.createElement('div');
  item.style.position = 'absolute';
  item.style.left = '100px';
  item.style.top = '100px';
  item.style.width = '50px';
  item.style.height = '50px';
  document.body.append(item);
  return item;
}

/** Presses on `item` and drags past the default 8px threshold. */
async function dragBy(
  ue: UserEvent,
  item: HTMLElement,
  dx: number,
  dy: number,
): Promise<void> {
  await ue.pointer([
    {
      target: item,
      keys: '[MouseLeft>]',
      coords: { clientX: 110, clientY: 110 },
    },
    { coords: { clientX: 110 + dx, clientY: 110 + dy } },
  ]);
}

/** Every reference-bearing field of a frame, for retention assertions. */
function references(frame: DragStateFrame): readonly unknown[] {
  return [
    frame.operation,
    frame.item,
    frame.visual,
    frame.originRect,
    frame.coordinateSpace,
    frame.proposal,
    frame.domain,
    frame.failureError,
    frame.cancelReason,
  ];
}

describe('draggable runtime', () => {
  let ue: UserEvent;

  beforeEach(() => {
    ue = userEvent.setup();
  });

  afterEach(() => {
    for (const controller of live.splice(0)) {
      controller.destroy();
    }
    document.body.replaceChildren();
  });

  describe('construction', () => {
    it('should require onDrop', () => {
      const item = createItem();
      expect(() =>
        // oxlint-disable-next-line typescript/no-explicit-any typescript/no-unsafe-type-assertion
        createDraggableControllerInternal(item, {} as any),
      ).toThrow(/onDrop/);
    });
  });

  describe('activation', () => {
    it('should invoke onStart once the threshold is crossed', async () => {
      const item = createItem();
      const onStart = voidFn();
      drag(item, { onDrop: accept, onStart });

      await dragBy(ue, item, 20, 0);

      expect(onStart).toHaveBeenCalledOnce();
    });

    it('should not activate below the threshold', async () => {
      const item = createItem();
      const onStart = voidFn();
      drag(item, { onDrop: accept, onStart });

      await dragBy(ue, item, 3, 0);

      expect(onStart).not.toHaveBeenCalled();
    });

    it('should invoke onMove after the visual has been written', async () => {
      const item = createItem();
      const transforms: string[] = [];
      drag(item, {
        onDrop: accept,
        onMove: () => {
          transforms.push(item.style.transform);
        },
      });

      await dragBy(ue, item, 20, 0);
      await ue.pointer({ coords: { clientX: 140, clientY: 110 } });

      expect(transforms.length).toBeGreaterThan(0);
      expect(transforms.at(-1)).toContain('translate');
    });

    it('should disarm a press released below the threshold', async () => {
      const item = createItem();
      const onStart = voidFn();
      const onFinish = voidFn();
      const { runtime } = drag(item, { onDrop: accept, onStart, onFinish });

      await ue.pointer([
        {
          target: item,
          keys: '[MouseLeft>]',
          coords: { clientX: 110, clientY: 110 },
        },
        { keys: '[/MouseLeft]', coords: { clientX: 112, clientY: 110 } },
      ]);

      expect(onStart).not.toHaveBeenCalled();
      expect(onFinish).not.toHaveBeenCalled();
      expect(runtime.current.phase).toBe(IDLE);
    });
  });

  describe('settlement', () => {
    it('should report an accepted drop through onFinish', async () => {
      const item = createItem();
      const onFinish = voidFn();
      drag(item, { onDrop: accept, onFinish });

      await dragBy(ue, item, 20, 0);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 130, clientY: 110 },
      });
      await flush();

      expect(onFinish).toHaveBeenCalledOnce();
      expect(onFinish.mock.calls[0]![0]).toMatchObject({
        type: OUTCOME_ACCEPTED,
      });
    });

    it('should report a rejected drop through onCancel', async () => {
      const item = createItem();
      const onCancel = voidFn();
      drag(item, {
        onDrop: () => FreeDropResolution.reject('nope'),
        onCancel,
      });

      await dragBy(ue, item, 20, 0);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 130, clientY: 110 },
      });
      await flush();

      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('should release the lift before the terminal callback runs', async () => {
      const item = createItem();
      let positionAtFinish: string | null = null;
      drag(item, {
        onDrop: accept,
        onFinish: () => {
          positionAtFinish = item.style.position;
        },
      });

      await dragBy(ue, item, 20, 0);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 130, clientY: 110 },
      });
      await flush();

      // The lift sets `position: fixed`; the authored value must be back before
      // the consumer observes the DOM.
      expect(positionAtFinish).toBe('absolute');
    });

    it('should cancel a live drag on Escape', async () => {
      const item = createItem();
      const onCancel = voidFn();
      drag(item, { onDrop: accept, onCancel });

      await dragBy(ue, item, 20, 0);
      await ue.keyboard('{Escape}');
      await flush();

      expect(onCancel).toHaveBeenCalledOnce();
      expect(onCancel.mock.calls[0]![0]).toMatchObject({
        type: OUTCOME_CANCELED,
      });
    });
  });

  describe('release closes motion but keeps cancellation (D-1)', () => {
    it('should still cancel on Escape while the resolver is pending', async () => {
      const item = createItem();
      const onCancel = voidFn();
      const onFinish = voidFn();
      let settle!: () => void;
      drag(item, {
        onDrop: () =>
          new Promise<FreeDropResolution>((resolve) => {
            settle = () => {
              resolve(FreeDropResolution.accept());
            };
          }),
        onCancel,
        onFinish,
      });

      await dragBy(ue, item, 20, 0);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 130, clientY: 110 },
      });
      await flush();

      // The resolver has not settled, so the operation is still cancellable.
      await ue.keyboard('{Escape}');
      await flush();

      expect(onCancel).toHaveBeenCalledOnce();

      // The late resolution must be inert.
      settle();
      await flush();
      expect(onFinish).not.toHaveBeenCalled();
    });

    it('should ignore pointer movement after release', async () => {
      const item = createItem();
      const onMove = voidFn();
      let request: FreeDropRequest | null = null;
      drag(item, {
        onMove,
        onDrop: (incoming) =>
          new Promise<FreeDropResolution>((resolve) => {
            request = incoming;
            setTimeout(() => {
              resolve(FreeDropResolution.accept());
            }, 0);
          }),
      });

      await dragBy(ue, item, 20, 0);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 130, clientY: 110 },
      });
      const movesAtRelease = onMove.mock.calls.length;

      await ue.pointer({ coords: { clientX: 300, clientY: 300 } });
      await flush();

      expect(onMove.mock.calls.length).toBe(movesAtRelease);
      expect(request).not.toBeNull();
      expect(request!.pointer).toEqual({ x: 130, y: 110 });
    });
  });

  describe('presentation readiness barrier', () => {
    it('should hold the lift until the consumer acknowledges', async () => {
      const item = createItem();
      const onFinish = voidFn();
      let resolveReady!: () => void;
      const ready = new Promise<void>((resolve) => {
        resolveReady = resolve;
      });
      drag(item, {
        onDrop: () => FreeDropResolution.accept(ready),
        onFinish,
      });

      await dragBy(ue, item, 20, 0);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 130, clientY: 110 },
      });
      await flush();

      expect(onFinish).not.toHaveBeenCalled();

      resolveReady();
      await vi.waitFor(() => {
        expect(onFinish).toHaveBeenCalledOnce();
      });
    });

    it('should report a rejected acknowledgement through onError only', async () => {
      const item = createItem();
      const onError = voidFn();
      const onFinish = voidFn();
      const onCancel = voidFn();
      let rejectReady!: (error: unknown) => void;
      const ready = new Promise<void>((_resolve, reject) => {
        rejectReady = reject;
      });
      drag(item, {
        onDrop: () => FreeDropResolution.accept(ready),
        onError,
        onFinish,
        onCancel,
      });

      await dragBy(ue, item, 20, 0);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 130, clientY: 110 },
      });
      await flush();
      rejectReady(new Error('render failed'));

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledOnce();
      });
      expect(onError.mock.calls[0]![1]).toMatchObject({
        cause: { stage: FAILURE_PRESENTATION_READY },
      });
      // D-3: a readiness failure reports onError and nothing else.
      expect(onFinish).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should give up when the acknowledgement never settles', async () => {
      const item = createItem();
      const onError = voidFn();
      drag(item, {
        onDrop: () => FreeDropResolution.accept(new Promise<void>(() => {})),
        onError,
      });

      await dragBy(ue, item, 20, 0);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 130, clientY: 110 },
      });

      await vi.waitFor(
        () => {
          expect(onError).toHaveBeenCalledOnce();
        },
        { timeout: PRESENTATION_READY_TIMEOUT + 500 },
      );
      expect(onError.mock.calls[0]![1]).toMatchObject({
        cause: { stage: FAILURE_PRESENTATION_READY },
      });
    });
  });

  describe('reentrancy', () => {
    it('should tear down synchronously when destroy is called from onMove', async () => {
      const item = createItem();
      const onFinish = voidFn();
      let runtime!: DraggableRuntime;
      let controller!: FreeDragController;
      const built = drag(item, {
        onDrop: accept,
        onFinish,
        onMove: () => {
          controller.destroy();
          // Physical teardown must already be complete on return.
          expect(runtime.closed).toBe(true);
          expect(runtime.lifetimes).toBeNull();
          expect(item.style.position).toBe('absolute');
        },
      });
      ({ controller, runtime } = built);

      await dragBy(ue, item, 20, 0);
      await ue.pointer({ coords: { clientX: 140, clientY: 110 } });
      await flush();

      expect(onFinish).not.toHaveBeenCalled();
    });

    it('should let a callback-queued cancel precede that callback throwing', async () => {
      const item = createItem();
      const order: string[] = [];
      let controller!: FreeDragController;
      const built = drag(item, {
        onDrop: accept,
        onCancel: () => {
          order.push('cancel');
        },
        onError: () => {
          order.push('error');
        },
        onMove: () => {
          controller.cancel('by-consumer');
          throw new Error('move failed');
        },
      });
      ({ controller } = built);

      await dragBy(ue, item, 20, 0);
      await ue.pointer({ coords: { clientX: 140, clientY: 110 } });
      await flush();

      // Cancellation is queued by the callback body; the throw checkpoint is
      // queued by the catch, so cancellation is handled first.
      expect(order[0]).toBe('cancel');
    });

    it('should ignore a cancel while idle', async () => {
      const item = createItem();
      const onCancel = voidFn();
      const { controller, runtime } = drag(item, { onDrop: accept, onCancel });

      controller.cancel('while-idle');

      expect(onCancel).not.toHaveBeenCalled();
      expect(runtime.cancelRequest).toBeNull();

      // The stray cancel must not poison the next operation.
      await dragBy(ue, item, 20, 0);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 130, clientY: 110 },
      });
      await flush();

      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should honour only the first cancel for one operation', async () => {
      const item = createItem();
      const onCancel = voidFn();
      const { controller } = drag(item, { onDrop: accept, onCancel });

      await dragBy(ue, item, 20, 0);
      controller.cancel('first');
      controller.cancel('second');
      await flush();

      expect(onCancel).toHaveBeenCalledOnce();
      expect(onCancel.mock.calls[0]![0]).toMatchObject({
        reason: { detail: 'first' },
      });
    });
  });

  describe('controlled position', () => {
    it('should copy the caller coordinates at dispatch', async () => {
      const item = createItem();
      const positions: unknown[] = [];
      const { controller } = drag(item, {
        onDrop: accept,
        onMove: (geometry) => {
          positions.push(geometry.viewportDelta);
        },
      });

      await dragBy(ue, item, 20, 0);

      const mutable = { x: 40, y: 0 };
      controller.update({ position: mutable });
      // Mutating after the call must not change what was committed.
      mutable.x = 999;
      await flush();

      expect(positions.at(-1)).toMatchObject({ x: expect.any(Number) });
      expect((positions.at(-1) as { x: number }).x).not.toBe(999);
    });
  });

  describe('retention', () => {
    it('should scrub both frames after a completed drag', async () => {
      const item = createItem();
      const { runtime } = drag(item, { onDrop: accept });

      await dragBy(ue, item, 20, 0);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 130, clientY: 110 },
      });
      await flush();

      expect(runtime.current.phase).toBe(IDLE);
      expect(references(runtime.current).every((value) => value === null)).toBe(
        true,
      );
      expect(references(runtime.draft).every((value) => value === null)).toBe(
        true,
      );
      expect(runtime.lifetimes).toBeNull();
      expect(runtime.lift).toBeNull();
      expect(runtime.resolution).toBeNull();
    });

    it('should clear frames, queue and attempts on destroy', async () => {
      const item = createItem();
      const { controller, runtime } = drag(item, { onDrop: accept });

      await dragBy(ue, item, 20, 0);
      controller.destroy();

      expect(runtime.closed).toBe(true);
      expect(runtime.actions).toHaveLength(0);
      expect(runtime.args).toHaveLength(0);
      expect(references(runtime.current).every((value) => value === null)).toBe(
        true,
      );
      expect(runtime.readiness).toBeNull();
      expect(runtime.landing).toBeNull();
    });

    it('should abort controller ingress on panic', async () => {
      const item = createItem();
      const onStart = voidFn();
      const { runtime } = drag(item, { onDrop: accept, onStart });
      // A panic reports through the platform reporter after teardown; capture
      // it so the runner does not see it as an unhandled failure.
      const reported = vi
        .spyOn(window, 'reportError')
        .mockImplementation(() => {});

      // An unknown action is an invariant violation, which is terminal.
      dispatch(runtime, 9999);

      expect(reported).toHaveBeenCalledOnce();
      expect(reported.mock.calls[0]![0]).toMatchObject({
        message: expect.stringContaining('unknown action'),
      });
      reported.mockRestore();

      expect(runtime.closed).toBe(true);
      expect(runtime.ingress.signal.aborted).toBe(true);

      // Ingress is gone, so a later press cannot start anything.
      await dragBy(ue, item, 20, 0);
      expect(onStart).not.toHaveBeenCalled();
    });
  });
});
