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

  it('should activate with a touch pointer despite failed capture', async () => {
    // A touch pointer rejects `setPointerCapture`; the drag must still start
    // rather than being aborted by the effect exception boundary.
    const item = createItem();
    const onStart = vi.fn<() => void>();
    const onError = vi.fn<() => void>();
    draggable(item, { touchAction: 'none', onStart, onError });

    await ue.pointer([
      {
        target: item,
        keys: '[TouchA>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { pointerName: 'TouchA', coords: { clientX: 160, clientY: 110 } },
      { keys: '[/TouchA]' },
    ]);

    expect(onStart).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
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

  it('should use the release position, not the last move, for the drop', async () => {
    const item = createItem();
    const onDrop = vi.fn(accept);
    draggable(item, { onDrop });

    // Release lands apart from the last pointermove; the drop must reflect it.
    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 150, clientY: 110 } },
      { keys: '[/MouseLeft]', coords: { clientX: 190, clientY: 130 } },
    ]);

    const [request] = onDrop.mock.calls[0]!;
    expect(request.viewportDelta).toEqual({ x: 80, y: 20 });
  });

  it('should stay terminal when onCancel destroys the controller', async () => {
    const item = createItem();
    const onFinish = vi.fn<(accepted: boolean) => void>();
    const drag = draggable(item, {
      onCancel: () => drag.destroy(),
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

    // Cancelling triggers onCancel, which destroys mid-settle: no throw, no
    // stranded animation, no post-destroy finish.
    await drag.cancel();
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    expect(item.matches(':popover-open')).toBeFalsy();
    expect(item.style.transform).toBe('');
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('should not let a cancelled drop settle a later gesture', async () => {
    const item = createItem();
    const resolvers: Array<(r: { accepted: boolean }) => void> = [];
    const finishes: boolean[] = [];
    const drag = draggable(item, {
      onDrop: () =>
        new Promise<{ accepted: boolean }>((resolve) => {
          resolvers.push(resolve);
        }),
      onFinish: (accepted) => {
        finishes.push(accepted);
      },
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    const pressMoveRelease = async (): Promise<void> => {
      await ue.pointer([
        {
          target: item,
          keys: '[MouseLeft>]',
          coords: { clientX: 110, clientY: 110 },
        },
        { coords: { clientX: 170, clientY: 110 } },
        { keys: '[/MouseLeft]' },
      ]);
    };

    // Gesture A: drop pending on resolvers[0]. Cancelling it finishes A itself
    // as rejected (finishes: [false]).
    await pressMoveRelease();
    await drag.cancel();
    await vi.waitFor(() => {
      expect(finishes).toEqual([false]);
    });

    // Gesture B: a fresh drop, pending on resolvers[1].
    await pressMoveRelease();

    // A's stale resolution must be ignored — it cannot accept B.
    resolvers[0]!({ accepted: true });
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    expect(finishes).toEqual([false]);

    // B's own resolution settles B.
    resolvers[1]!({ accepted: true });
    await vi.waitFor(() => {
      expect(finishes).toEqual([false, true]);
    });
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

  it('should keep the lifted visual within a bounds element on every side', async () => {
    const area = document.createElement('div');
    Object.assign(area.style, {
      position: 'absolute',
      left: '20px',
      top: '20px',
      width: '300px',
      height: '200px',
      overflow: 'hidden',
    });
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'absolute',
      left: '10px',
      top: '10px',
      width: '60px',
      height: '60px',
    });
    area.append(box);
    document.body.append(area);

    draggable(box, { bounds: area, touchAction: 'none' });

    // Drag hard into the bottom-right corner: the lifted box must not overflow
    // the area — the UA popover padding must not enlarge it past its pinned size.
    await ue.pointer([
      {
        target: box,
        keys: '[MouseLeft>]',
        coords: { clientX: 40, clientY: 40 },
      },
      { coords: { clientX: 4000, clientY: 4000 } },
    ]);

    const boxRect = box.getBoundingClientRect();
    const areaRect = area.getBoundingClientRect();
    expect(boxRect.right).toBeLessThanOrEqual(areaRect.right + 0.5);
    expect(boxRect.bottom).toBeLessThanOrEqual(areaRect.bottom + 0.5);
    expect(boxRect.width).toBeCloseTo(60, 1);
  });

  it('should preserve the authored box and fill when lifting', async () => {
    const item = createItem();
    // A bordered, padded, transparent box: the lift must not change its outer
    // size (border-box) or paint an opaque UA popover background over it.
    item.style.boxSizing = 'border-box';
    item.style.border = '5px solid rgb(10, 20, 30)';
    item.style.padding = '8px';
    item.style.background = 'transparent';

    const before = item.getBoundingClientRect();
    draggable(item);

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 150, clientY: 110 } },
    ]);

    const after = item.getBoundingClientRect();
    // Outer size is unchanged — no UA padding/border enlargement.
    expect(after.width).toBeCloseTo(before.width, 1);
    expect(after.height).toBeCloseTo(before.height, 1);
    // Authored border and transparent fill survive the promotion.
    expect(item.style.borderTopWidth).toBe('5px');
    expect(item.style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('should track the pointer under an ancestor CSS zoom', async () => {
    const outer = document.createElement('div');
    outer.style.zoom = '1.5';
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'absolute',
      left: '20px',
      top: '20px',
      width: '30px',
      height: '30px',
    });
    outer.append(box);
    document.body.append(outer);

    draggable(box, { touchAction: 'none' });

    const start = box.getBoundingClientRect();
    const cx = start.left + start.width / 2;
    const cy = start.top + start.height / 2;

    await ue.pointer([
      {
        target: box,
        keys: '[MouseLeft>]',
        coords: { clientX: cx, clientY: cy },
      },
      { coords: { clientX: cx + 45, clientY: cy } },
      { coords: { clientX: cx + 90, clientY: cy } },
    ]);

    const moved = box.getBoundingClientRect();
    // The lifted box follows the pointer 1:1 in viewport space despite the 1.5×
    // ancestor zoom — the translate is not scaled up to 135px.
    expect(moved.left - start.left).toBeCloseTo(90, 0);
    // …and it keeps its rendered size rather than being enlarged by the zoom.
    expect(moved.width).toBeCloseTo(start.width, 0);
  });

  it('should not jump at activation under a static zoomed ancestor', async () => {
    // The reported bug: a static (non-offsetParent) zoomed ancestor offset from
    // the origin. The compositor skipped its `zoom`, and the lift relied on the
    // browser re-applying inherited zoom to the fixed element — which Firefox
    // does not — so the tile jumped toward the origin at grab.
    const zoomed = document.createElement('div');
    zoomed.style.zoom = '1.25';
    const spacer = document.createElement('div');
    spacer.style.height = '200px';
    const box = document.createElement('div');
    Object.assign(box.style, { width: '60px', height: '60px' });
    zoomed.append(spacer, box);
    document.body.append(zoomed);

    const before = box.getBoundingClientRect();
    draggable(box, { touchAction: 'none' });

    await ue.pointer([
      {
        target: box,
        keys: '[MouseLeft>]',
        coords: { clientX: before.left + 10, clientY: before.top + 10 },
      },
      { coords: { clientX: before.left + 10, clientY: before.top + 20 } },
    ]);

    const after = box.getBoundingClientRect();
    // The tile stays put (only the 10px drag), keeping its zoomed size.
    expect(after.left).toBeCloseTo(before.left, 0);
    expect(after.top - before.top).toBeCloseTo(10, 0);
    expect(after.width).toBeCloseTo(before.width, 0);
  });

  it('should track the pointer under a CSS zoom on the visual itself', async () => {
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'absolute',
      left: '20px',
      top: '20px',
      width: '30px',
      height: '30px',
      zoom: '2',
    });
    document.body.append(box);

    draggable(box, { touchAction: 'none' });

    const start = box.getBoundingClientRect();
    const cx = start.left + start.width / 2;
    const cy = start.top + start.height / 2;

    await ue.pointer([
      {
        target: box,
        keys: '[MouseLeft>]',
        coords: { clientX: cx, clientY: cy },
      },
      { coords: { clientX: cx + 40, clientY: cy + 40 } },
    ]);

    const moved = box.getBoundingClientRect();
    // The lifted element's net zoom is neutralized to 1 and the 2× is reproduced
    // by the matrix, so it tracks 1:1: 40px of pointer travel is 40px of viewport
    // movement, not 80px, with no activation jump.
    expect(moved.left - start.left).toBeCloseTo(40, 0);
    expect(moved.top - start.top).toBeCloseTo(40, 0);
    // …and the box keeps its zoomed rendered size.
    expect(moved.width).toBeCloseTo(start.width, 0);
  });

  it('should apply transform writes instantly despite an authored transition', async () => {
    const item = createItem();
    // A long transform transition would animate the lift matrix and retarget on
    // every move, jumping and lagging the drag — the lift must suppress it.
    item.style.transition = 'transform 10s linear';
    const before = item.getBoundingClientRect();
    draggable(item);

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 170, clientY: 110 } },
    ]);

    // The transition is suppressed inline while lifted, so the move lands at once.
    expect(item.style.transition).toBe('none');
    const after = item.getBoundingClientRect();
    expect(after.left - before.left).toBeCloseTo(60, 0);
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

  it('should drag in place without lifting, translating in local space', async () => {
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

    draggable(item, { lift: 'none', touchAction: 'none' });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 60, clientY: 60 },
      },
      { coords: { clientX: 120, clientY: 60 } },
    ]);

    // No top-layer lift: the item stays in the container.
    expect(item.matches(':popover-open')).toBeFalsy();
    // A 60px viewport move under a 2× container is a 30px local translate, so
    // the item stays glued to the pointer while keeping the container's scale.
    expect(item.style.transform).toBe('translate(30px, 0px)');
  });

  it('should lift faithfully by default, preserving the ancestor transform', async () => {
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

    // Default lift is the faithful matrix lift.
    draggable(item, { touchAction: 'none' });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 60, clientY: 60 },
      },
      { coords: { clientX: 120, clientY: 60 } },
    ]);

    // Lifted into the top layer…
    expect(item.matches(':popover-open')).toBeTruthy();
    // …but the ancestor 2× scale is re-applied as a matrix, so the box does not
    // flatten. The drag translation is prepended in viewport space.
    expect(
      item.style.transform.startsWith('translate(60px, 0px)'),
    ).toBeTruthy();
    expect(item.style.transform).toContain('matrix(2, 0, 0, 2');
  });

  it('should not distort a self-transformed visual on the default lift', async () => {
    const item = createItem();
    // A 50px box scaled to 100px on screen.
    item.style.transform = 'scale(2)';
    const before = item.getBoundingClientRect().width;
    expect(before).toBeCloseTo(100, 0);

    draggable(item, { touchAction: 'none' });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 150, clientY: 110 } },
    ]);

    // The faithful lift reproduces the rendered size — it is not pinned to the
    // already-scaled bounding rect and scaled again (which gave 200px).
    expect(item.getBoundingClientRect().width).toBeCloseTo(100, 0);
  });

  it('should flatten a self-transformed visual to its natural size when asked', async () => {
    const item = createItem();
    item.style.transform = 'scale(2)'; // 50px → 100px on screen

    draggable(item, { lift: 'flatten', touchAction: 'none' });

    await ue.pointer([
      {
        target: item,
        keys: '[MouseLeft>]',
        coords: { clientX: 110, clientY: 110 },
      },
      { coords: { clientX: 150, clientY: 110 } },
    ]);

    // Flatten drops the transform: the visual renders at its natural 50px size,
    // axis-aligned, with only a translation applied.
    expect(item.matches(':popover-open')).toBeTruthy();
    expect(item.getBoundingClientRect().width).toBeCloseTo(50, 0);
    expect(item.style.transform).toBe('translate(40px, 0px)');
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
