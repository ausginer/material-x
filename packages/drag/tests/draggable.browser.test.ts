import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  draggable,
  type DraggableOptions,
  type FreeDragCancelResult,
  type FreeDragController,
  type FreeDragFinishResult,
  type FreeDropResolution,
  type FreeDropRequest,
} from '../src/draggable.ts';

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

const accept = (): FreeDropResolution => ({ type: 'accepted' });

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
      (_request: FreeDropRequest): FreeDropResolution => ({ type: 'accepted' }),
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
    expect(onFinish.mock.calls[0]![0].type).toBe('accepted');
    expect(item.matches(':popover-open')).toBeFalsy();
  });

  it('should route an explicit rejection through onCancel', async () => {
    const item = createItem();
    const onCancel = vi.fn<(r: FreeDragCancelResult) => void>();
    const onError = vi.fn<(...a: unknown[]) => void>();
    drag(item, {
      onDrop: () => ({ type: 'rejected', reason: 'nope' }),
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
    expect(onCancel.mock.calls[0]![0].type).toBe('rejected');
    expect(onError).not.toHaveBeenCalled();
  });

  it('should await an asynchronous acceptance', async () => {
    const item = createItem();
    const onFinish = vi.fn<(...a: unknown[]) => void>();
    drag(item, {
      onDrop: async () => {
        await Promise.resolve();
        return { type: 'accepted' };
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
    expect(onCancel.mock.calls[0]![0].type).toBe('canceled');
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
});
