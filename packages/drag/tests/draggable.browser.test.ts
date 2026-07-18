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

  it('should install the touch-action policy before any gesture', () => {
    const item = createItem();
    const drag = draggable(item, { touchAction: 'none' });

    expect(item.style.touchAction).toBe('none');

    drag.destroy();

    expect(item.style.touchAction).toBe('');
  });

  it('should not finish or restart after destroy mid-drag', async () => {
    const item = createItem();
    const onFinish = vi.fn<(accepted: boolean) => void>();
    const drag = draggable(item, {
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
    ]);

    drag.destroy();
    // Give any stray landing animation a chance to resolve and re-enter cleanup.
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    expect(onFinish).not.toHaveBeenCalled();
    expect(item.matches(':popover-open')).toBeFalsy();
    expect(item.style.transform).toBe('');
  });

  it('should forward the cancel reason to onCancel', async () => {
    const item = createItem();
    const onCancel = vi.fn<(reason: unknown) => void>();
    const drag = draggable(item, {
      onCancel,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 170, clientY: 110 } },
    ]);

    await drag.cancel('outside');

    expect(onCancel).toHaveBeenCalledWith('outside');
  });

  it('should roll back and recover when an effect throws', async () => {
    const item = createItem();
    const onError = vi.fn<(error: unknown) => void>();
    let failing = true;
    draggable(item, {
      onStart() {
        if (failing) {
          throw new Error('boom');
        }
      },
      onError,
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

    // The throw during activation is reported and rolled back, not stranded.
    expect(onError).toHaveBeenCalledOnce();
    expect(item.matches(':popover-open')).toBeFalsy();

    // A later gesture still works — the session was reset, not wedged.
    failing = false;
    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 170, clientY: 110 } },
    ]);

    expect(item.matches(':popover-open')).toBeTruthy();
  });

  it('should preserve the authored transform while dragging', async () => {
    const item = createItem();
    item.style.transform = 'rotate(30deg)';
    draggable(item);

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 170, clientY: 110 } },
    ]);

    // The drag translation is prepended; the authored rotate (a matrix in
    // computed form) is still composed in rather than discarded.
    expect(
      item.style.transform.startsWith('translate(60px, 0px)'),
    ).toBeTruthy();
    expect(item.style.transform).toContain('matrix(');
  });

  it('should report the local delta through a scaled coordinate context', async () => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.transform = 'scale(2)';
    document.body.append(container);

    const item = document.createElement('div');
    item.style.position = 'absolute';
    item.style.left = '20px';
    item.style.top = '20px';
    item.style.width = '25px';
    item.style.height = '25px';
    container.append(item);

    const onMove = vi.fn<(geometry: DragGeometry) => void>();
    draggable(item, { onMove });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 60, clientY: 60 },
      },
      // First move activates the drag; the second is a tracked drag move that
      // reports geometry.
      { coords: { clientX: 90, clientY: 70 } },
      { coords: { clientX: 120, clientY: 80 } },
    ]);

    const [geometry] = onMove.mock.calls.at(-1)!;
    // The container scales local space 2×, so a viewport delta maps to half the
    // local delta, while the viewport delta stays raw.
    expect(geometry.viewportDelta).toEqual({ x: 60, y: 20 });
    expect(geometry.localDelta.x).toBeCloseTo(30, 1);
    expect(geometry.localDelta.y).toBeCloseTo(10, 1);
  });

  it('should keep tracking a mouse that leaves the item before activation', async () => {
    const item = createItem();
    const onStart = vi.fn<() => void>();
    draggable(item, { onStart });

    // Press on the item, then move far outside it before crossing the threshold.
    // Document-level tracking must still activate the drag.
    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { target: document.body, coords: { clientX: 500, clientY: 500 } },
    ]);

    expect(onStart).toHaveBeenCalledOnce();
  });
});
