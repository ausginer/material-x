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
  type Point,
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

  it('should disarm a press released before the activation threshold', async () => {
    const item = createItem();
    const onDrop = vi.fn(accept);
    const onStart = vi.fn();
    drag(item, { onDrop, onStart });

    // A click: pressed and released in place, never crossing the threshold.
    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
    ]);
    await ue.pointer({
      keys: '[/MouseLeft]',
      coords: { clientX: 110, clientY: 110 },
    });
    await flush();

    // Moving far past the threshold afterwards must not drag: no button is
    // held, and the released press no longer arms anything.
    await ue.pointer({ coords: { clientX: 200, clientY: 200 } });
    await flush();

    expect(onStart).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
    expect(item.matches(':popover-open')).toBeFalsy();
    expect(item.style.position).toBe('absolute');
  });

  /**
   * Pending-to-idle must always disarm without producing a normal completion:
   * nothing was ever activated, so there is no outcome to report.
   */
  describe('pending disarm', () => {
    /** Arms a press and moves it, but never past the activation threshold. */
    const arm = (user: UserEvent, item: HTMLElement): Promise<void> =>
      user.pointer([
        {
          target: item,
          keys: '[MouseLeft>]',
          coords: { clientX: 110, clientY: 110 },
        },
        { coords: { clientX: 112, clientY: 111 } },
      ]);

    it('should disarm on pointercancel without any completion callback', async () => {
      const item = createItem();
      const onFinish = vi.fn();
      const onCancel = vi.fn();
      const onError = vi.fn();
      drag(item, { onDrop: accept, onFinish, onCancel, onError });

      await arm(ue, item);
      document.dispatchEvent(
        new PointerEvent('pointercancel', {
          pointerId: 1,
          isPrimary: true,
          bubbles: true,
        }),
      );
      await flush();

      expect(onFinish).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(item.matches(':popover-open')).toBeFalsy();
    });

    it('should leave nothing armed after pointercancel', async () => {
      const item = createItem();
      const onStart = vi.fn();
      drag(item, { onDrop: accept, onStart });

      await arm(ue, item);
      document.dispatchEvent(
        new PointerEvent('pointercancel', {
          pointerId: 1,
          isPrimary: true,
          bubbles: true,
        }),
      );
      // The distinguishing assertion: an operation merely left pending would
      // activate here, with no button held.
      await ue.pointer({ coords: { clientX: 400, clientY: 400 } });
      await flush();

      expect(onStart).not.toHaveBeenCalled();
      expect(item.matches(':popover-open')).toBeFalsy();
    });

    it('should disarm on Escape without any completion callback', async () => {
      const item = createItem();
      const onFinish = vi.fn();
      const onCancel = vi.fn();
      const onError = vi.fn();
      drag(item, { onDrop: accept, onFinish, onCancel, onError });

      await arm(ue, item);
      await ue.keyboard('{Escape}');
      await flush();

      expect(onFinish).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should leave nothing armed after Escape', async () => {
      const item = createItem();
      const onStart = vi.fn();
      drag(item, { onDrop: accept, onStart });

      await arm(ue, item);
      await ue.keyboard('{Escape}');
      await ue.pointer({ coords: { clientX: 400, clientY: 400 } });
      await flush();

      expect(onStart).not.toHaveBeenCalled();
      expect(item.matches(':popover-open')).toBeFalsy();
    });

    it('should disarm silently on destroy', async () => {
      const item = createItem();
      const onFinish = vi.fn();
      const onCancel = vi.fn();
      const onError = vi.fn();
      const controller = drag(item, {
        onDrop: accept,
        onFinish,
        onCancel,
        onError,
      });

      await arm(ue, item);
      controller.destroy();
      await flush();

      expect(onFinish).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should not activate after a pending gesture was disarmed by destroy', async () => {
      const item = createItem();
      const onStart = vi.fn();
      const controller = drag(item, { onDrop: accept, onStart });

      await arm(ue, item);
      controller.destroy();
      await ue.pointer({ coords: { clientX: 400, clientY: 400 } });
      await flush();

      expect(onStart).not.toHaveBeenCalled();
      expect(item.matches(':popover-open')).toBeFalsy();
    });
  });

  describe('activation continuity', () => {
    it('should follow the pointer without a jump on the move after activation', async () => {
      const item = createItem();
      drag(item, { onDrop: accept });
      const before = item.getBoundingClientRect();

      // One move crosses the threshold; a real pointer often reports a large
      // first delta, so the activating move must not be discarded.
      await press(
        ue,
        item,
        { clientX: 110, clientY: 110 },
        { clientX: 150, clientY: 150 },
      );
      const activated = item.getBoundingClientRect();

      await ue.pointer({ coords: { clientX: 155, clientY: 158 } });
      const after = item.getBoundingClientRect();

      // The visual may only move as far as the pointer did between the two
      // events; anything more is the activating delta being applied late.
      expect(after.left - activated.left).toBeCloseTo(5, 0);
      expect(after.top - activated.top).toBeCloseTo(8, 0);
      expect(activated.left - before.left).toBeCloseTo(40, 0);
      expect(activated.top - before.top).toBeCloseTo(40, 0);
    });

    it('should report the accumulated grab delta to onStart', async () => {
      const item = createItem();
      const onStart = vi.fn<(geometry: { viewportDelta: Point }) => void>();
      drag(item, { onDrop: accept, onStart });

      await press(
        ue,
        item,
        { clientX: 110, clientY: 110 },
        { clientX: 150, clientY: 150 },
      );

      // `viewportDelta` is documented as `pointer - originPointer`, and the
      // pointer has already travelled 40px by the time the drag starts.
      expect(onStart).toHaveBeenCalledOnce();
      expect(onStart.mock.calls[0]![0].viewportDelta).toEqual({ x: 40, y: 40 });
    });
  });

  describe('public callback contract', () => {
    it('should release the visual before onFinish runs', async () => {
      const item = createItem();
      let openAtCallback: boolean | null = null;
      let positionAtCallback: string | null = null;
      drag(item, {
        onDrop: accept,
        onFinish: () => {
          // Visual ownership must be back with the consumer by now.
          openAtCallback = item.matches(':popover-open');
          positionAtCallback = item.style.position;
        },
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
      await vi.waitFor(() => expect(openAtCallback).not.toBeNull());

      expect(openAtCallback).toBeFalsy();
      expect(positionAtCallback).toBe('absolute');
    });

    it('should release the visual before onCancel runs on rejection', async () => {
      const item = createItem();
      let openAtCallback: boolean | null = null;
      drag(item, {
        onDrop: () => FreeDropResolution.reject('no'),
        onCancel: () => {
          openAtCallback = item.matches(':popover-open');
        },
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
      await vi.waitFor(() => expect(openAtCallback).not.toBeNull());

      expect(openAtCallback).toBeFalsy();
    });

    it('should never run both onFinish and onCancel for one operation', async () => {
      const item = createItem();
      const onFinish = vi.fn();
      const onCancel = vi.fn();
      drag(item, { onDrop: accept, onFinish, onCancel });

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
      await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce());
      await flush();

      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should forward an error thrown by onFinish through onError', async () => {
      const item = createItem();
      const failure = new Error('consumer finish failed');
      const onError = vi.fn<(...a: unknown[]) => void>();
      drag(item, {
        onDrop: accept,
        onFinish: () => {
          throw failure;
        },
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
      await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());

      expect(onError.mock.calls[0]![0]).toBe(failure);
    });
  });

  describe('destroy', () => {
    it('should close event ingress so later input is inert', async () => {
      const item = createItem();
      const onStart = vi.fn();
      const onDrop = vi.fn(accept);
      const controller = drag(item, { onDrop, onStart });

      controller.destroy();
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

      expect(onStart).not.toHaveBeenCalled();
      expect(onDrop).not.toHaveBeenCalled();
    });

    it('should be idempotent', () => {
      const item = createItem();
      const controller = drag(item, { onDrop: accept });

      expect(() => {
        controller.destroy();
        controller.destroy();
      }).not.toThrow();
    });

    it('should restore the visual when destroyed mid-drag', async () => {
      const item = createItem();
      const controller = drag(item, { onDrop: accept });

      await press(
        ue,
        item,
        { clientX: 110, clientY: 110 },
        { clientX: 200, clientY: 200 },
      );
      expect(item.matches(':popover-open')).toBeTruthy();

      controller.destroy();
      await flush();

      expect(item.matches(':popover-open')).toBeFalsy();
      expect(item.style.position).toBe('absolute');
    });

    it('should stay silent when destroyed mid-drag', async () => {
      const item = createItem();
      const onFinish = vi.fn();
      const onCancel = vi.fn();
      const onError = vi.fn();
      const controller = drag(item, {
        onDrop: accept,
        onFinish,
        onCancel,
        onError,
      });

      await press(
        ue,
        item,
        { clientX: 110, clientY: 110 },
        { clientX: 200, clientY: 200 },
      );
      controller.destroy();
      await flush();

      // Destroy is out-of-band teardown, not an outcome.
      expect(onFinish).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  /**
   * Document-level session listeners exist only while a gesture is armed. They
   * are counted directly rather than inferred from behaviour, because a leaked
   * listener that happens to be inert still accumulates across gestures.
   */
  describe('listener lifetime', () => {
    /** Counts live document listeners by tracking add/remove and abort signals. */
    function trackDocumentListeners(): {
      live(): number;
      restore(): void;
    } {
      const add = document.addEventListener.bind(document);
      const remove = document.removeEventListener.bind(document);
      let live = 0;

      document.addEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) => {
        live += 1;
        const signal = typeof options === 'object' ? options.signal : undefined;
        signal?.addEventListener('abort', () => {
          live -= 1;
        });
        add(type, listener, options);
      }) as typeof document.addEventListener;

      document.removeEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
      ) => {
        live -= 1;
        remove(type, listener, options);
      }) as typeof document.removeEventListener;

      return {
        live: () => live,
        restore() {
          document.addEventListener = add;
          document.removeEventListener = remove;
        },
      };
    }

    it('should hold no document listeners once a gesture completes', async () => {
      const item = createItem();
      const onFinish = vi.fn();
      drag(item, { onDrop: accept, onFinish });
      const tracker = trackDocumentListeners();

      try {
        const before = tracker.live();
        await press(
          ue,
          item,
          { clientX: 110, clientY: 110 },
          { clientX: 160, clientY: 160 },
        );
        expect(tracker.live()).toBeGreaterThan(before);

        await ue.pointer({
          keys: '[/MouseLeft]',
          coords: { clientX: 160, clientY: 160 },
        });
        await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce());
        await flush();

        expect(tracker.live()).toBe(before);
      } finally {
        tracker.restore();
      }
    });

    it('should release document listeners when a pending press is disarmed', async () => {
      const item = createItem();
      drag(item, { onDrop: accept });
      const tracker = trackDocumentListeners();

      try {
        const before = tracker.live();
        await ue.pointer([
          {
            target: item,
            keys: '[MouseLeft>]',
            coords: { clientX: 110, clientY: 110 },
          },
          { coords: { clientX: 112, clientY: 111 } },
        ]);
        expect(tracker.live()).toBeGreaterThan(before);

        await ue.pointer({
          keys: '[/MouseLeft]',
          coords: { clientX: 112, clientY: 111 },
        });
        await flush();

        expect(tracker.live()).toBe(before);
      } finally {
        tracker.restore();
      }
    });

    it('should release document listeners on destroy mid-gesture', async () => {
      const item = createItem();
      const controller = drag(item, { onDrop: accept });
      const tracker = trackDocumentListeners();

      try {
        const before = tracker.live();
        await press(
          ue,
          item,
          { clientX: 110, clientY: 110 },
          { clientX: 160, clientY: 160 },
        );
        expect(tracker.live()).toBeGreaterThan(before);

        controller.destroy();
        await flush();

        expect(tracker.live()).toBe(before);
      } finally {
        tracker.restore();
      }
    });
  });

  describe('resolution currency', () => {
    it('should ignore an acceptance that arrives after the gesture was canceled', async () => {
      const item = createItem();
      let settle!: () => void;
      const onFinish = vi.fn();
      const onCancel = vi.fn();
      const controller = drag(item, {
        onDrop: () =>
          new Promise<FreeDropResolution>((resolve) => {
            settle = () => resolve(FreeDropResolution.accept());
          }),
        onFinish,
        onCancel,
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
      // The resolver is still open; cancelling supersedes it.
      controller.cancel('superseded');
      await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce());

      settle();
      await flush();

      // The late acceptance belongs to a resolution that no longer exists.
      expect(onFinish).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('should ignore an acceptance that arrives after destroy', async () => {
      const item = createItem();
      let settle!: () => void;
      const onFinish = vi.fn();
      const controller = drag(item, {
        onDrop: () =>
          new Promise<FreeDropResolution>((resolve) => {
            settle = () => resolve(FreeDropResolution.accept());
          }),
        onFinish,
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
      controller.destroy();
      settle();
      await flush();

      expect(onFinish).not.toHaveBeenCalled();
    });

    it('should abort the resolution signal when the gesture is canceled', async () => {
      const item = createItem();
      let aborted = false;
      const controller = drag(item, {
        onDrop: (_request, { signal }) => {
          signal.addEventListener('abort', () => {
            aborted = true;
          });
          return new Promise<FreeDropResolution>(() => {});
        },
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
      expect(aborted).toBeFalsy();

      controller.cancel();
      await vi.waitFor(() => expect(aborted).toBeTruthy());
    });

    it('should not abort the resolution signal after normal completion', async () => {
      const item = createItem();
      let aborted = false;
      const onFinish = vi.fn();
      drag(item, {
        onDrop: (_request, { signal }) => {
          signal.addEventListener('abort', () => {
            aborted = true;
          });
          return FreeDropResolution.accept();
        },
        onFinish,
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
      await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce());
      await flush();

      expect(aborted).toBeFalsy();
    });
  });

  // Bounds clamping forces a synchronous layout. Resolving it on sub-threshold
  // moves would flush layout on every `pointermove` for a value the reducer
  // discards while pending — a perf regression the behavioural tests cannot see,
  // since the outcome is identical either way. These pin the read to the phase
  // that actually consumes it.
  describe('bounds layout reads', () => {
    function createBounds(): HTMLElement {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.width = '1000px';
      el.style.height = '1000px';
      document.body.append(el);
      return el;
    }

    it('should not resolve bounds for sub-threshold moves', async () => {
      const item = createItem();
      const bounds = createBounds();
      const spy = vi.spyOn(bounds, 'getBoundingClientRect');
      drag(item, { bounds, onDrop: accept });

      // Every step stays within the 8px activation threshold of the origin.
      await ue.pointer([
        {
          target: item,
          keys: '[MouseLeft>]',
          coords: { clientX: 110, clientY: 110 },
        },
        { coords: { clientX: 112, clientY: 111 } },
        { coords: { clientX: 113, clientY: 113 } },
        { coords: { clientX: 114, clientY: 112 } },
      ]);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should resolve bounds once dragging', async () => {
      const item = createItem();
      const bounds = createBounds();
      const spy = vi.spyOn(bounds, 'getBoundingClientRect');
      drag(item, { bounds, onDrop: accept });

      // The crossing move activates but still dispatches while pending; the move
      // after it is the first that runs in the dragging phase and clamps.
      await ue.pointer([
        {
          target: item,
          keys: '[MouseLeft>]',
          coords: { clientX: 110, clientY: 110 },
        },
        { coords: { clientX: 140, clientY: 140 } },
        { coords: { clientX: 150, clientY: 150 } },
      ]);

      expect(spy).toHaveBeenCalled();
    });

    it('should resolve a static bounds element once across many dragging moves', async () => {
      const item = createItem();
      const bounds = createBounds();
      const spy = vi.spyOn(bounds, 'getBoundingClientRect');
      drag(item, { bounds, onDrop: accept });

      // An element rect only changes on scroll/resize, none of which happen here,
      // so the first dragging read fills the cache and every later move reuses it.
      await ue.pointer([
        {
          target: item,
          keys: '[MouseLeft>]',
          coords: { clientX: 110, clientY: 110 },
        },
        { coords: { clientX: 140, clientY: 140 } },
        { coords: { clientX: 150, clientY: 150 } },
        { coords: { clientX: 160, clientY: 170 } },
        { coords: { clientX: 180, clientY: 190 } },
      ]);

      expect(spy).toHaveBeenCalledOnce();
    });

    it('should invoke a function bounds provider on every dragging move', async () => {
      const item = createItem();
      const provide = vi.fn(() => new DOMRectReadOnly(0, 0, 1000, 1000));
      drag(item, { bounds: provide, onDrop: accept });

      await ue.pointer([
        {
          target: item,
          keys: '[MouseLeft>]',
          coords: { clientX: 110, clientY: 110 },
        },
        { coords: { clientX: 140, clientY: 140 } },
        { coords: { clientX: 150, clientY: 150 } },
        { coords: { clientX: 160, clientY: 170 } },
      ]);

      // A function provider is never cached: its value may vary independently of
      // scroll/resize, so each dragging move calls it afresh.
      expect(provide.mock.calls.length).toBeGreaterThan(1);
    });
  });
});
