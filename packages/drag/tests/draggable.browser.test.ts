import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  draggable,
  FreeDropResolution,
  FreeDropResult,
  type DraggableOptions,
  type FreeDragCancelResult,
  type FreeDragController,
  type FreeDragFinishResult,
  type FreeDropRequest,
} from '../src/draggable.ts';
import { PRESENTATION_READY_TIMEOUT } from '../src/kernel/presentation-ready.ts';
import {
  FAILURE_HOME_TARGET,
  FAILURE_PRESENTATION_READY,
} from '../src/kernel/protocol.ts';

const live: FreeDragController[] = [];

/** Constructs a controller and tracks it for teardown. */
function drag(
  item: HTMLElement,
  options: DraggableOptions,
): FreeDragController {
  const controller = draggable(item, options);
  live.push(controller);
  return controller;
}

const accept = (): FreeDropResolution => FreeDropResolution.accept();

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

async function press(
  ue: UserEvent,
  item: HTMLElement,
  from: { clientX: number; clientY: number },
  to: { clientX: number; clientY: number },
): Promise<void> {
  await ue.pointer([
    { target: item, keys: '[MouseLeft>]', coords: from },
    { coords: to },
  ]);
}

describe('draggable', () => {
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

  it('should require onDrop at construction', () => {
    const item = createItem();
    // oxlint-disable-next-line typescript/no-explicit-any typescript/no-unsafe-type-assertion
    expect(() => draggable(item, {} as any)).toThrow(/onDrop/);
  });

  it('should not activate before the threshold is crossed', async () => {
    const item = createItem();
    const onStart = vi.fn<(...a: unknown[]) => void>();
    drag(item, { onStart, onDrop: accept });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 113, clientY: 112 },
    );

    expect(onStart).not.toHaveBeenCalled();
    expect(item.matches(':popover-open')).toBeFalsy();
  });

  it('should lift the item into the top layer once activated', async () => {
    const item = createItem();
    const onStart = vi.fn<(...a: unknown[]) => void>();
    drag(item, { onStart, onDrop: accept });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 140, clientY: 140 },
    );

    expect(onStart).toHaveBeenCalledOnce();
    expect(item.matches(':popover-open')).toBeTruthy();
  });

  it('should resolve an accepted drop through onFinish and restore the visual', async () => {
    const item = createItem();
    const onFinish = vi.fn<(r: FreeDragFinishResult) => void>();
    const onDrop = vi.fn(
      (_request: FreeDropRequest): FreeDropResolution =>
        FreeDropResolution.accept(),
    );
    drag(item, { onDrop, onFinish });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 160, clientY: 160 },
    );
    await ue.pointer({
      keys: '[/MouseLeft]',
      coords: { clientX: 160, clientY: 160 },
    });
    await flush();

    expect(onDrop).toHaveBeenCalledOnce();
    const [request] = onDrop.mock.calls[0]!;
    expect(request.item).toBe(item);
    expect(onFinish).toHaveBeenCalledOnce();
    expect(FreeDropResult.isAccepted(onFinish.mock.calls[0]![0])).toBeTruthy();
    expect(item.matches(':popover-open')).toBeFalsy();
  });

  it('should route an explicit rejection through onCancel', async () => {
    const item = createItem();
    const onCancel = vi.fn<(r: FreeDragCancelResult) => void>();
    const onError = vi.fn<(...a: unknown[]) => void>();
    drag(item, {
      onDrop: () => FreeDropResolution.reject('nope'),
      onCancel,
      onError,
    });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 160, clientY: 160 },
    );
    await ue.pointer({
      keys: '[/MouseLeft]',
      coords: { clientX: 160, clientY: 160 },
    });
    await flush();

    expect(onCancel).toHaveBeenCalledOnce();
    expect(FreeDropResult.isRejected(onCancel.mock.calls[0]![0])).toBeTruthy();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should await an asynchronous acceptance', async () => {
    const item = createItem();
    const onFinish = vi.fn<(...a: unknown[]) => void>();
    drag(item, {
      onDrop: async () => {
        await Promise.resolve();
        return FreeDropResolution.accept();
      },
      onFinish,
    });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 160, clientY: 160 },
    );
    await ue.pointer({
      keys: '[/MouseLeft]',
      coords: { clientX: 160, clientY: 160 },
    });
    await flush();

    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('should treat an invalid resolution as an error, not acceptance', async () => {
    const item = createItem();
    const onFinish = vi.fn<(...a: unknown[]) => void>();
    const onCancel = vi.fn<(...a: unknown[]) => void>();
    const onError = vi.fn<(...a: unknown[]) => void>();
    drag(item, {
      // oxlint-disable-next-line typescript/no-explicit-any typescript/no-unsafe-type-assertion
      onDrop: () => ({ accepted: true }) as any,
      onFinish,
      onCancel,
      onError,
    });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 160, clientY: 160 },
    );
    await ue.pointer({
      keys: '[/MouseLeft]',
      coords: { clientX: 160, clientY: 160 },
    });
    await flush();

    expect(onError).toHaveBeenCalledOnce();
    expect(onFinish).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should animate home and cancel on rejection when a valid home target is configured', async () => {
    const item = createItem();
    const onCancel = vi.fn<(r: FreeDragCancelResult) => void>();
    const onError = vi.fn<(...a: unknown[]) => void>();
    drag(item, {
      onDrop: () => FreeDropResolution.reject('nope'),
      resolveHomeTarget: () => ({
        position: { x: 100, y: 100 },
        space: 'viewport',
      }),
      onCancel,
      onError,
    });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 200, clientY: 200 },
    );
    await ue.pointer({
      keys: '[/MouseLeft]',
      coords: { clientX: 200, clientY: 200 },
    });
    // A home animation runs, so onCancel is deferred until it completes.
    await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    expect(FreeDropResult.isRejected(onCancel.mock.calls[0]![0])).toBeTruthy();
    expect(onError).not.toHaveBeenCalled();
    expect(item.matches(':popover-open')).toBeFalsy();
  });

  it('should treat a throwing home-target resolver as an error, not a cancel', async () => {
    const item = createItem();
    const onCancel = vi.fn<(...a: unknown[]) => void>();
    const onFinish = vi.fn<(...a: unknown[]) => void>();
    const onError = vi.fn<(...a: unknown[]) => void>();
    drag(item, {
      onDrop: () => FreeDropResolution.reject('nope'),
      resolveHomeTarget: () => {
        throw new Error('no home');
      },
      onCancel,
      onFinish,
      onError,
    });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 200, clientY: 200 },
    );
    await ue.pointer({
      keys: '[/MouseLeft]',
      coords: { clientX: 200, clientY: 200 },
    });
    await flush();

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]![1]).toMatchObject({
      cause: { stage: FAILURE_HOME_TARGET },
    });
    expect(onCancel).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(item.matches(':popover-open')).toBeFalsy();
  });

  it('should treat an invalid home-target result as an error', async () => {
    const item = createItem();
    const onCancel = vi.fn<(...a: unknown[]) => void>();
    const onError = vi.fn<(...a: unknown[]) => void>();
    drag(item, {
      onDrop: () => FreeDropResolution.reject('nope'),
      // oxlint-disable-next-line typescript/no-explicit-any typescript/no-unsafe-type-assertion
      resolveHomeTarget: () =>
        ({ position: { x: Number.NaN, y: 0 }, space: 'viewport' }) as any,
      onCancel,
      onError,
    });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 200, clientY: 200 },
    );
    await ue.pointer({
      keys: '[/MouseLeft]',
      coords: { clientX: 200, clientY: 200 },
    });
    await flush();

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]![1]).toMatchObject({
      cause: { stage: FAILURE_HOME_TARGET },
    });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should cancel a live drag on Escape through onCancel', async () => {
    const item = createItem();
    const onCancel = vi.fn<(r: FreeDragCancelResult) => void>();
    drag(item, { onDrop: accept, onCancel });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 160, clientY: 160 },
    );
    await ue.keyboard('{Escape}');
    await flush();

    expect(onCancel).toHaveBeenCalledOnce();
    expect(FreeDropResult.isCanceled(onCancel.mock.calls[0]![0])).toBeTruthy();
    expect(item.matches(':popover-open')).toBeFalsy();
  });

  it('should stay silent on destroy', async () => {
    const item = createItem();
    const onFinish = vi.fn<(...a: unknown[]) => void>();
    const onCancel = vi.fn<(...a: unknown[]) => void>();
    const controller = drag(item, { onDrop: accept, onFinish, onCancel });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 160, clientY: 160 },
    );
    controller.destroy();
    await flush();

    expect(onFinish).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(item.matches(':popover-open')).toBeFalsy();
  });

  it('should not start after destroy', async () => {
    const item = createItem();
    const onStart = vi.fn<(...a: unknown[]) => void>();
    const controller = drag(item, { onDrop: accept, onStart });
    controller.destroy();

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 160, clientY: 160 },
    );

    expect(onStart).not.toHaveBeenCalled();
  });

  it('should retarget a controlled position while dragging', async () => {
    const item = createItem();
    const onMove = vi.fn<(...a: unknown[]) => void>();
    const controller = drag(item, { onDrop: accept, onMove });

    await press(
      ue,
      item,
      { clientX: 110, clientY: 110 },
      { clientX: 160, clientY: 160 },
    );
    onMove.mockClear();
    controller.update({ position: { x: 300, y: 300 } });

    expect(onMove).toHaveBeenCalled();
  });

  describe('presentationReady barrier', () => {
    /** A manually settled acknowledgement, so the test owns the timing. */
    function deferred(): {
      promise: Promise<void>;
      resolve(): void;
      reject(error: unknown): void;
    } {
      let resolve!: () => void;
      let reject!: (error: unknown) => void;
      const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    it('should hold the lift until the consumer acknowledges', async () => {
      const item = createItem();
      const ready = deferred();
      const onFinish = vi.fn<(...a: unknown[]) => void>();
      drag(item, {
        onDrop: () => FreeDropResolution.accept(ready.promise),
        onFinish,
      });

      await press(
        ue,
        item,
        { clientX: 110, clientY: 110 },
        { clientX: 160, clientY: 160 },
      );
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 160, clientY: 160 },
      });
      await flush();

      // An accepted free drop skips landing entirely, so without the barrier
      // the lift would already be gone and onFinish already called.
      expect(item.matches(':popover-open')).toBeTruthy();
      expect(onFinish).not.toHaveBeenCalled();

      ready.resolve();
      await flush();

      expect(item.matches(':popover-open')).toBeFalsy();
      expect(onFinish).toHaveBeenCalledOnce();
    });

    it('should release immediately when no acknowledgement is supplied', async () => {
      const item = createItem();
      const onFinish = vi.fn<(...a: unknown[]) => void>();
      drag(item, { onDrop: accept, onFinish });

      await press(
        ue,
        item,
        { clientX: 110, clientY: 110 },
        { clientX: 160, clientY: 160 },
      );
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 160, clientY: 160 },
      });
      await flush();

      expect(onFinish).toHaveBeenCalledOnce();
      expect(item.matches(':popover-open')).toBeFalsy();
    });

    it('should report a rejected acknowledgement as a presentation failure', async () => {
      const item = createItem();
      const ready = deferred();
      const onError = vi.fn<(...a: unknown[]) => void>();
      const onFinish = vi.fn<(...a: unknown[]) => void>();
      drag(item, {
        onDrop: () => FreeDropResolution.accept(ready.promise),
        onError,
        onFinish,
      });

      await press(
        ue,
        item,
        { clientX: 110, clientY: 110 },
        { clientX: 160, clientY: 160 },
      );
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 160, clientY: 160 },
      });
      await flush();

      ready.reject(new Error('render failed'));
      await flush();

      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0]![1]).toMatchObject({
        cause: { stage: FAILURE_PRESENTATION_READY },
      });
      // Cleanup still runs: a failed acknowledgement must not strand the drag.
      expect(item.matches(':popover-open')).toBeFalsy();
      expect(onFinish).not.toHaveBeenCalled();
    });

    it('should give up and clean up when the acknowledgement never settles', async () => {
      const item = createItem();
      const onError = vi.fn<(...a: unknown[]) => void>();
      drag(item, {
        onDrop: () => FreeDropResolution.accept(new Promise<void>(() => {})),
        onError,
      });

      await press(
        ue,
        item,
        { clientX: 110, clientY: 110 },
        { clientX: 160, clientY: 160 },
      );
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: 160, clientY: 160 },
      });

      await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce(), {
        timeout: PRESENTATION_READY_TIMEOUT + 500,
      });

      expect(onError.mock.calls[0]![1]).toMatchObject({
        cause: { stage: FAILURE_PRESENTATION_READY },
      });
      expect(item.matches(':popover-open')).toBeFalsy();
    });
  });
});
