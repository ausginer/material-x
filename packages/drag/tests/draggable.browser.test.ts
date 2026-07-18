import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { draggable } from '../src/draggable.ts';
import type { DragGeometry, FreeDropRequest } from '../src/kernel/types.ts';

const accept = (_request: FreeDropRequest) => ({ accepted: true });

/** A frame tick, to let a scheduled `requestAnimationFrame` run. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/** A positioned box appended to the body, torn down after each test. */
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

describe('draggable', () => {
  let ue: UserEvent;

  beforeEach(() => {
    ue = userEvent.setup();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('should not activate before the threshold is crossed', async () => {
    const item = createItem();
    const onStart = vi.fn<() => void>();
    draggable(item, { onStart });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 113, clientY: 112 } },
    ]);

    expect(onStart).not.toHaveBeenCalled();
    expect(item.matches(':popover-open')).toBeFalsy();
  });

  it('should lift the item into the top layer once activated', async () => {
    const item = createItem();
    const onStart = vi.fn<() => void>();
    draggable(item, { onStart });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 140, clientY: 110 } },
    ]);

    expect(onStart).toHaveBeenCalledOnce();
    expect(item.matches(':popover-open')).toBeTruthy();
  });

  it('should leave a click without movement untouched', async () => {
    const item = createItem();
    const onStart = vi.fn<() => void>();
    const onDrop = vi.fn();
    draggable(item, { onStart, onDrop });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onStart).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('should report the viewport delta to the drop callback', async () => {
    const item = createItem();
    const onDrop = vi.fn(accept);
    draggable(item, { onDrop });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 170, clientY: 130 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onDrop).toHaveBeenCalledOnce();
    const [request] = onDrop.mock.calls[0]!;
    expect(request.viewportDelta).toEqual({ x: 60, y: 20 });
  });

  it('should constrain movement to the x axis', async () => {
    const item = createItem();
    const onDrop = vi.fn(accept);
    draggable(item, { axis: 'x', onDrop });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 170, clientY: 160 } },
      { keys: '[/MouseLeft]' },
    ]);

    const [request] = onDrop.mock.calls[0]!;
    expect(request.viewportDelta).toEqual({ x: 60, y: 0 });
  });

  it('should restore the item and finish accepted after a drop', async () => {
    const item = createItem();
    const onFinish = vi.fn<(accepted: boolean) => void>();
    draggable(item, {
      onDrop: () => ({ accepted: true }),
      onFinish,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 170, clientY: 110 } },
      { keys: '[/MouseLeft]' },
    ]);

    await vi.waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith(true);
    });
    expect(item.matches(':popover-open')).toBeFalsy();
    expect(item.style.position).toBe('absolute');
  });

  it('should finish rejected when the consumer rejects the drop', async () => {
    const item = createItem();
    const onFinish = vi.fn<(accepted: boolean) => void>();
    draggable(item, {
      onDrop: () => ({ accepted: false }),
      onFinish,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 170, clientY: 110 } },
      { keys: '[/MouseLeft]' },
    ]);

    await vi.waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith(false);
    });
  });

  it('should restore the item when destroyed mid-drag', async () => {
    const item = createItem();
    const drag = draggable(item);

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 170, clientY: 110 } },
    ]);
    await nextFrame();

    expect(item.matches(':popover-open')).toBeTruthy();

    drag.destroy();

    expect(item.matches(':popover-open')).toBeFalsy();
    expect(item.style.position).toBe('absolute');
  });

  it('should retarget the live position through update()', async () => {
    const item = createItem();
    const onMove = vi.fn<(geometry: DragGeometry) => void>();
    const drag = draggable(item, { onMove });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 140, clientY: 110 } },
    ]);

    onMove.mockClear();
    // Origin rect is the item at (100, 100); an identity-space position of
    // (200, 200) is a viewport delta of (100, 100).
    drag.update({ position: { x: 200, y: 200 } });

    expect(onMove).toHaveBeenCalledOnce();
    const [geometry] = onMove.mock.calls[0]!;
    expect(geometry.viewportDelta).toEqual({ x: 100, y: 100 });
  });

  it('should re-report geometry on scroll while dragging', async () => {
    const item = createItem();
    const onMove = vi.fn<(geometry: DragGeometry) => void>();
    draggable(item, { onMove });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 140, clientY: 110 } },
    ]);

    onMove.mockClear();
    dispatchEvent(new Event('scroll'));

    expect(onMove).toHaveBeenCalledOnce();
  });
});
