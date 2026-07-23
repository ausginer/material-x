import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRESENTATION_READY_TIMEOUT } from '../src/kernel/presentation-ready.ts';
import { FAILURE_PRESENTATION_READY } from '../src/kernel/protocol.ts';
import {
  sortable,
  type ReorderRequest,
  ReorderResolution,
  SortableResult,
  type SortableCancelResult,
  type SortableController,
  type SortableFinishResult,
  type SortableOptions,
} from '../src/sortable.ts';

const accept = (): ReorderResolution => ReorderResolution.accept();

const live: SortableController[] = [];

function sort(
  container: HTMLElement,
  options: SortableOptions,
): SortableController {
  const controller = sortable(container, options);
  live.push(controller);
  return controller;
}

function flush(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** A vertical list of `count` 40px-tall rows. */
function createList(count: number): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100px';
  for (let i = 0; i < count; i += 1) {
    const row = document.createElement('div');
    row.textContent = `row ${i}`;
    row.style.height = '40px';
    row.style.width = '100px';
    container.append(row);
  }
  document.body.append(container);
  return container;
}

const rows = (container: HTMLElement): HTMLElement[] =>
  [...container.children] as HTMLElement[];

/** The engine's placeholder is the only child without text content. */
const placeholderIn = (container: HTMLElement): HTMLElement | undefined =>
  rows(container).find((row) => !row.textContent);

function centerOf(el: HTMLElement): { clientX: number; clientY: number } {
  const r = el.getBoundingClientRect();
  return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
}

describe('sortable', () => {
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

  it('should require onReorder at construction', () => {
    const container = createList(2);
    // oxlint-disable-next-line typescript/no-explicit-any typescript/no-unsafe-type-assertion
    expect(() =>
      sortable(container, { items: () => rows(container) } as any),
    ).toThrow(/onReorder/);
  });

  it('should roll back a partial activation when placeholder creation fails', async () => {
    const container = createList(3);
    const items = rows(container);
    const onError = vi.fn<(...args: unknown[]) => void>();
    sort(container, {
      items: () => rows(container),
      onReorder: accept,
      onError,
      createPlaceholder() {
        throw new Error('placeholder failed');
      },
    });

    const start = centerOf(items[0]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
      { coords: { clientX: start.clientX, clientY: start.clientY + 20 } },
    ]);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());

    expect(placeholderIn(container)).toBeUndefined();
    expect(items[0]!.matches(':popover-open')).toBeFalsy();
    expect(items[0]!.style.transform).toBe('');
    expect(items[0]!.hasPointerCapture(1)).toBeFalsy();
  });

  it('should roll back visual and placeholder when insertion fails', async () => {
    const container = createList(3);
    const items = rows(container);
    const onError = vi.fn<(...args: unknown[]) => void>();
    const insertBefore = container.insertBefore.bind(container);
    vi.spyOn(container, 'insertBefore').mockImplementation((node, child) => {
      insertBefore(node, child);
      throw new Error('insertion failed');
    });
    sort(container, {
      items: () => rows(container),
      onReorder: accept,
      onError,
    });

    const start = centerOf(items[0]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
      { coords: { clientX: start.clientX, clientY: start.clientY + 20 } },
    ]);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());

    expect(placeholderIn(container)).toBeUndefined();
    expect(items[0]!.matches(':popover-open')).toBeFalsy();
    expect(items[0]!.style.transform).toBe('');
    expect(items[0]!.hasPointerCapture(1)).toBeFalsy();
  });

  it('should roll back local activation when placeholder creation destroys', async () => {
    const container = createList(3);
    const items = rows(container);
    const onError = vi.fn<(...args: unknown[]) => void>();
    const onStart = vi.fn();
    let controller: SortableController;
    controller = sort(container, {
      items: () => rows(container),
      onReorder: accept,
      onError,
      onStart,
      createPlaceholder() {
        controller.destroy();
        return document.createElement('div');
      },
    });

    const start = centerOf(items[0]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
      { coords: { clientX: start.clientX, clientY: start.clientY + 20 } },
    ]);
    await flush();

    expect(placeholderIn(container)).toBeUndefined();
    expect(items[0]!.matches(':popover-open')).toBeFalsy();
    expect(items[0]!.style.transform).toBe('');
    expect(onStart).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should reuse measured rectangles for an unchanged active insertion', async () => {
    const container = createList(4);
    const items = rows(container);
    const measurements = items
      .slice(1)
      .map((item) => vi.spyOn(item, 'getBoundingClientRect'));
    sort(container, {
      items: () => rows(container),
      onReorder: accept,
    });

    const start = centerOf(items[0]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
      { coords: { clientX: start.clientX, clientY: start.clientY + 10 } },
    ]);
    await ue.pointer({
      coords: { clientX: start.clientX + 1, clientY: start.clientY + 11 },
    });
    await vi.waitFor(() => {
      expect(
        measurements.every((measure) => measure.mock.calls.length > 0),
      ).toBe(true);
    });
    for (const measure of measurements) {
      measure.mockClear();
    }

    await ue.pointer({
      coords: { clientX: start.clientX + 2, clientY: start.clientY + 12 },
    });
    await flush();

    expect(measurements.map((measure) => measure.mock.calls.length)).toEqual([
      0, 0, 0,
    ]);

    await ue.pointer({ keys: '[/MouseLeft]' });
  });

  it('should propose a reorder and finish accepted when dropping over a neighbour', async () => {
    const container = createList(3);
    const items = rows(container);
    const onReorder = vi.fn(
      (_request: ReorderRequest): ReorderResolution =>
        ReorderResolution.accept(),
    );
    const onFinish = vi.fn<(r: SortableFinishResult) => void>();
    sort(container, { items: () => rows(container), onReorder, onFinish });

    const start = centerOf(items[0]!);
    const over = centerOf(items[1]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
      { coords: { clientX: over.clientX, clientY: over.clientY + 5 } },
      { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
    ]);
    await ue.pointer({
      keys: '[/MouseLeft]',
      coords: { clientX: over.clientX, clientY: over.clientY + 8 },
    });
    await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    expect(onReorder).toHaveBeenCalledOnce();
    const [request] = onReorder.mock.calls[0]!;
    expect(request.item).toBe(items[0]);
    expect(request.from).toBe(0);
    expect(request.to).toBeGreaterThan(0);
    expect(onFinish).toHaveBeenCalledOnce();
    expect(SortableResult.isAccepted(onFinish.mock.calls[0]![0])).toBeTruthy();
  });

  it('should finish a drop in place as a no-op without calling onReorder', async () => {
    const container = createList(3);
    const items = rows(container);
    const onReorder = vi.fn(accept);
    const onFinish = vi.fn<(r: SortableFinishResult) => void>();
    sort(container, { items: () => rows(container), onReorder, onFinish });

    const start = centerOf(items[0]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
      { coords: { clientX: start.clientX, clientY: start.clientY + 10 } },
      { coords: { clientX: start.clientX, clientY: start.clientY } },
    ]);
    await ue.pointer({ keys: '[/MouseLeft]', coords: start });
    await flush();

    expect(onReorder).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledOnce();
    expect(SortableResult.isNoOp(onFinish.mock.calls[0]![0])).toBeTruthy();
  });

  it('should route an explicit rejection through onCancel', async () => {
    const container = createList(3);
    const items = rows(container);
    const onCancel = vi.fn<(r: SortableCancelResult) => void>();
    const onError = vi.fn<(...a: unknown[]) => void>();
    sort(container, {
      items: () => rows(container),
      onReorder: () => ReorderResolution.reject('no'),
      onCancel,
      onError,
    });

    const start = centerOf(items[0]!);
    const over = centerOf(items[1]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
      { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
    ]);
    await ue.pointer({
      keys: '[/MouseLeft]',
      coords: { clientX: over.clientX, clientY: over.clientY + 8 },
    });
    await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    expect(SortableResult.isRejected(onCancel.mock.calls[0]![0])).toBeTruthy();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should cancel on Escape through onCancel', async () => {
    const container = createList(3);
    const items = rows(container);
    const onCancel = vi.fn<(r: SortableCancelResult) => void>();
    sort(container, {
      items: () => rows(container),
      onReorder: accept,
      onCancel,
    });

    const start = centerOf(items[0]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
      { coords: { clientX: start.clientX, clientY: start.clientY + 30 } },
    ]);
    await ue.keyboard('{Escape}');
    await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    expect(SortableResult.isCanceled(onCancel.mock.calls[0]![0])).toBeTruthy();
  });

  it('should animate the visual home before onCancel on an explicit rejection', async () => {
    const container = createList(3);
    const items = rows(container);
    const onCancel = vi.fn<(r: SortableCancelResult) => void>();
    sort(container, {
      items: () => rows(container),
      onReorder: () => ReorderResolution.reject('no'),
      onCancel,
    });

    const start = centerOf(items[0]!);
    const over = centerOf(items[1]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
      { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
    ]);
    // A landing animation runs, so the visual is still lifted when onCancel is
    // not yet called; it is disposed (popover closed, transform cleared) only
    // after the home animation completes.
    expect(onCancel).not.toHaveBeenCalled();
    await ue.pointer({
      keys: '[/MouseLeft]',
      coords: { clientX: over.clientX, clientY: over.clientY + 8 },
    });
    await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    expect(items[0]!.matches(':popover-open')).toBeFalsy();
    expect(items[0]!.style.transform).toBe('');
  });

  it('should cancel when the dragged item is removed from the collection', async () => {
    const container = createList(3);
    let items = rows(container);
    const onCancel = vi.fn<(r: SortableCancelResult) => void>();
    const controller = sort(container, {
      items: () => items,
      onReorder: accept,
      onCancel,
    });

    const start = centerOf(items[0]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
      { coords: { clientX: start.clientX, clientY: start.clientY + 30 } },
    ]);

    const removed = items[0]!;
    items = items.slice(1);
    removed.remove();
    controller.updateItems(items);
    await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    expect(SortableResult.isCanceled(onCancel.mock.calls[0]![0])).toBeTruthy();
  });

  it('should reorder through an arrow-key command and finish accepted', async () => {
    const container = createList(3);
    const items = rows(container);
    const onReorder = vi.fn(
      (_request: ReorderRequest): ReorderResolution =>
        ReorderResolution.accept(),
    );
    const onFinish = vi.fn<(r: SortableFinishResult) => void>();
    sort(container, { items: () => rows(container), onReorder, onFinish });

    items[0]!.focus();
    items[0]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }),
    );
    await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    expect(onReorder).toHaveBeenCalledOnce();
    const [request] = onReorder.mock.calls[0]!;
    expect(request.item).toBe(items[0]);
    expect(request.from).toBe(0);
    expect(request.to).toBe(1);
    expect(SortableResult.isAccepted(onFinish.mock.calls[0]![0])).toBeTruthy();
  });

  it('should ignore an arrow-key command that cannot move the edge item', async () => {
    const container = createList(3);
    const items = rows(container);
    const onReorder = vi.fn(accept);
    const onFinish = vi.fn<(...a: unknown[]) => void>();
    sort(container, { items: () => rows(container), onReorder, onFinish });

    items[0]!.focus();
    items[0]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true,
      }),
    );
    await flush();

    expect(onReorder).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('should route an explicit rejection of a keyboard command through onCancel', async () => {
    const container = createList(3);
    const items = rows(container);
    const onCancel = vi.fn<(r: SortableCancelResult) => void>();
    sort(container, {
      items: () => rows(container),
      onReorder: () => ReorderResolution.reject('no'),
      onCancel,
    });

    items[1]!.focus();
    items[1]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true,
      }),
    );
    await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    expect(SortableResult.isRejected(onCancel.mock.calls[0]![0])).toBeTruthy();
  });

  it('should stay silent on destroy', async () => {
    const container = createList(3);
    const items = rows(container);
    const onFinish = vi.fn<(...a: unknown[]) => void>();
    const onCancel = vi.fn<(...a: unknown[]) => void>();
    const controller = sort(container, {
      items: () => rows(container),
      onReorder: accept,
      onFinish,
      onCancel,
    });

    const start = centerOf(items[0]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
      { coords: { clientX: start.clientX, clientY: start.clientY + 30 } },
    ]);
    controller.destroy();
    await flush();

    expect(onFinish).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
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

    /** Drags row 0 over row 1 and releases. */
    async function dropOverNeighbour(
      items: readonly HTMLElement[],
    ): Promise<void> {
      const start = centerOf(items[0]!);
      const over = centerOf(items[1]!);
      await ue.pointer([
        { target: items[0]!, keys: '[MouseLeft>]', coords: start },
        { coords: { clientX: over.clientX, clientY: over.clientY + 5 } },
        { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
      ]);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: over.clientX, clientY: over.clientY + 8 },
      });
    }

    it('should hold the placeholder until the consumer acknowledges', async () => {
      const container = createList(3);
      const items = rows(container);
      const ready = deferred();
      const onFinish = vi.fn<(...a: unknown[]) => void>();
      sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: () => ReorderResolution.accept(ready.promise),
        onFinish,
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      await dropOverNeighbour(items);
      await flush();

      // Landing has a zero duration, so only the barrier can still be holding
      // the temporary presentation here.
      expect(placeholderIn(container)).toBeDefined();
      expect(onFinish).not.toHaveBeenCalled();

      ready.resolve();
      await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce(), {
        timeout: 1000,
      });

      expect(placeholderIn(container)).toBeUndefined();
    });

    it('should release immediately when no acknowledgement is supplied', async () => {
      const container = createList(3);
      const items = rows(container);
      const onFinish = vi.fn<(...a: unknown[]) => void>();
      sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: accept,
        onFinish,
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      await dropOverNeighbour(items);
      await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce(), {
        timeout: 1000,
      });

      expect(placeholderIn(container)).toBeUndefined();
    });

    it('should report a rejected acknowledgement as a presentation failure', async () => {
      const container = createList(3);
      const items = rows(container);
      const ready = deferred();
      const onError = vi.fn<(...a: unknown[]) => void>();
      sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: () => ReorderResolution.accept(ready.promise),
        onError,
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      await dropOverNeighbour(items);
      await flush();
      ready.reject(new Error('render failed'));

      await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce(), {
        timeout: 1000,
      });

      expect(onError.mock.calls[0]![1]).toMatchObject({
        cause: { stage: FAILURE_PRESENTATION_READY },
      });
      // Cleanup still runs: a failed acknowledgement must not strand the drag.
      await vi.waitFor(() => expect(placeholderIn(container)).toBeUndefined());
    });

    it('should give up and clean up when the acknowledgement never settles', async () => {
      const container = createList(3);
      const items = rows(container);
      const onError = vi.fn<(...a: unknown[]) => void>();
      sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: () => ReorderResolution.accept(new Promise<void>(() => {})),
        onError,
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      await dropOverNeighbour(items);
      await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce(), {
        timeout: PRESENTATION_READY_TIMEOUT + 500,
      });

      expect(onError.mock.calls[0]![1]).toMatchObject({
        cause: { stage: FAILURE_PRESENTATION_READY },
      });
      await vi.waitFor(() => expect(placeholderIn(container)).toBeUndefined());
    });
  });

  it('should disarm a press released before the activation threshold', async () => {
    const container = createList(3);
    const items = rows(container);
    const onReorder = vi.fn(accept);
    const onStart = vi.fn<(item: HTMLElement) => void>();
    sort(container, { items: () => rows(container), onReorder, onStart });

    // A click: pressed and released in place, never crossing the threshold.
    const start = centerOf(items[0]!);
    await ue.pointer([
      { target: items[0]!, keys: '[MouseLeft>]', coords: start },
    ]);
    await ue.pointer({ keys: '[/MouseLeft]', coords: start });
    await flush();

    // Moving far past the threshold afterwards must not drag: no button is
    // held, and the released press no longer arms anything.
    await ue.pointer({
      coords: { clientX: start.clientX, clientY: start.clientY + 60 },
    });
    await flush();

    expect(onStart).not.toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
    expect(items[0]!.matches(':popover-open')).toBeFalsy();
    expect(items[0]!.style.position).toBe('');
    expect(rows(container)).toHaveLength(3);
  });

  /**
   * Pending-to-idle must always disarm without producing a normal completion.
   * Each case asserts the *observable* consequence — that a later move cannot
   * activate — because "no callback ran" is equally true of a gesture wrongly
   * left armed.
   */
  describe('pending disarm', () => {
    /** Arms a press and moves it, but never past the activation threshold. */
    const arm = (
      user: UserEvent,
      item: HTMLElement,
      at: { clientX: number; clientY: number },
    ): Promise<void> =>
      user.pointer([
        { target: item, keys: '[MouseLeft>]', coords: at },
        { coords: { clientX: at.clientX + 2, clientY: at.clientY + 1 } },
      ]);

    it('should leave nothing armed after pointercancel', async () => {
      const container = createList(3);
      const items = rows(container);
      const onStart = vi.fn<(item: HTMLElement) => void>();
      sort(container, {
        items: () => rows(container),
        onReorder: accept,
        onStart,
      });

      const start = centerOf(items[0]!);
      await arm(ue, items[0]!, start);
      document.dispatchEvent(
        new PointerEvent('pointercancel', {
          pointerId: 1,
          isPrimary: true,
          bubbles: true,
        }),
      );
      await ue.pointer({
        coords: { clientX: start.clientX, clientY: start.clientY + 200 },
      });
      await flush();

      expect(onStart).not.toHaveBeenCalled();
      expect(placeholderIn(container)).toBeUndefined();
    });

    it('should leave nothing armed after Escape', async () => {
      const container = createList(3);
      const items = rows(container);
      const onStart = vi.fn<(item: HTMLElement) => void>();
      sort(container, {
        items: () => rows(container),
        onReorder: accept,
        onStart,
      });

      const start = centerOf(items[0]!);
      await arm(ue, items[0]!, start);
      await ue.keyboard('{Escape}');
      await ue.pointer({
        coords: { clientX: start.clientX, clientY: start.clientY + 200 },
      });
      await flush();

      expect(onStart).not.toHaveBeenCalled();
      expect(placeholderIn(container)).toBeUndefined();
    });

    it('should leave nothing armed after destroy', async () => {
      const container = createList(3);
      const items = rows(container);
      const onStart = vi.fn<(item: HTMLElement) => void>();
      const controller = sort(container, {
        items: () => rows(container),
        onReorder: accept,
        onStart,
      });

      const start = centerOf(items[0]!);
      await arm(ue, items[0]!, start);
      controller.destroy();
      await ue.pointer({
        coords: { clientX: start.clientX, clientY: start.clientY + 200 },
      });
      await flush();

      expect(onStart).not.toHaveBeenCalled();
      expect(placeholderIn(container)).toBeUndefined();
    });

    it('should disarm without cancelling when the dragged item is removed before activation', async () => {
      const container = createList(3);
      let items = rows(container);
      const onCancel = vi.fn<(r: SortableCancelResult) => void>();
      const onStart = vi.fn<(item: HTMLElement) => void>();
      const controller = sort(container, {
        items: () => items,
        onReorder: accept,
        onCancel,
        onStart,
      });

      const start = centerOf(items[0]!);
      await arm(ue, items[0]!, start);

      const removed = items[0]!;
      items = items.slice(1);
      removed.remove();
      controller.updateItems(items);
      await flush();

      // Removal before activation disarms; there is no activated operation to
      // report, so `onCancel` must stay silent — unlike removal mid-drag.
      expect(onCancel).not.toHaveBeenCalled();
      expect(onStart).not.toHaveBeenCalled();
    });

    it('should not run any completion callback for a disarmed press', async () => {
      const container = createList(3);
      const items = rows(container);
      const onFinish = vi.fn<(r: SortableFinishResult) => void>();
      const onCancel = vi.fn<(r: SortableCancelResult) => void>();
      const onError = vi.fn<(...a: unknown[]) => void>();
      sort(container, {
        items: () => rows(container),
        onReorder: accept,
        onFinish,
        onCancel,
        onError,
      });

      const start = centerOf(items[0]!);
      await arm(ue, items[0]!, start);
      await ue.pointer({ keys: '[/MouseLeft]', coords: start });
      await flush();

      expect(onFinish).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('public callback contract', () => {
    it('should remove the placeholder and release the lift before onFinish runs', async () => {
      const container = createList(3);
      const items = rows(container);
      let placeholderAtCallback: HTMLElement | undefined;
      let openAtCallback: boolean | null = null;
      sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: accept,
        onFinish: () => {
          placeholderAtCallback = placeholderIn(container);
          openAtCallback = items[0]!.matches(':popover-open');
        },
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      const over = centerOf(items[1]!);
      await ue.pointer([
        {
          target: items[0]!,
          keys: '[MouseLeft>]',
          coords: centerOf(items[0]!),
        },
        { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
      ]);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: over.clientX, clientY: over.clientY + 8 },
      });
      await vi.waitFor(() => expect(openAtCallback).not.toBeNull(), {
        timeout: 1000,
      });

      expect(placeholderAtCallback).toBeUndefined();
      expect(openAtCallback).toBeFalsy();
    });

    it('should never run both onFinish and onCancel for one operation', async () => {
      const container = createList(3);
      const items = rows(container);
      const onFinish = vi.fn<(r: SortableFinishResult) => void>();
      const onCancel = vi.fn<(r: SortableCancelResult) => void>();
      sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: accept,
        onFinish,
        onCancel,
      });

      const over = centerOf(items[1]!);
      await ue.pointer([
        {
          target: items[0]!,
          keys: '[MouseLeft>]',
          coords: centerOf(items[0]!),
        },
        { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
      ]);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: over.clientX, clientY: over.clientY + 8 },
      });
      await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce(), {
        timeout: 1000,
      });
      await flush();

      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should forward an error thrown by onFinish through onError', async () => {
      const container = createList(3);
      const items = rows(container);
      const failure = new Error('consumer finish failed');
      const onError = vi.fn<(...a: unknown[]) => void>();
      sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: accept,
        onFinish: () => {
          throw failure;
        },
        onError,
      });

      const over = centerOf(items[1]!);
      await ue.pointer([
        {
          target: items[0]!,
          keys: '[MouseLeft>]',
          coords: centerOf(items[0]!),
        },
        { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
      ]);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: over.clientX, clientY: over.clientY + 8 },
      });
      await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce(), {
        timeout: 1000,
      });

      expect(onError.mock.calls[0]![0]).toBe(failure);
    });
  });

  describe('destroy', () => {
    it('should close event ingress so later input is inert', async () => {
      const container = createList(3);
      const items = rows(container);
      const onStart = vi.fn<(item: HTMLElement) => void>();
      const onReorder = vi.fn(accept);
      const controller = sort(container, {
        items: () => rows(container),
        onReorder,
        onStart,
      });

      controller.destroy();
      const over = centerOf(items[1]!);
      await ue.pointer([
        {
          target: items[0]!,
          keys: '[MouseLeft>]',
          coords: centerOf(items[0]!),
        },
        { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
      ]);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: over.clientX, clientY: over.clientY + 8 },
      });
      await flush();

      expect(onStart).not.toHaveBeenCalled();
      expect(onReorder).not.toHaveBeenCalled();
    });

    it('should be idempotent', () => {
      const container = createList(3);
      const controller = sort(container, {
        items: () => rows(container),
        onReorder: accept,
      });

      expect(() => {
        controller.destroy();
        controller.destroy();
      }).not.toThrow();
    });

    it('should remove the placeholder and restore the item when destroyed mid-drag', async () => {
      const container = createList(3);
      const items = rows(container);
      const controller = sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: accept,
      });

      await ue.pointer([
        {
          target: items[0]!,
          keys: '[MouseLeft>]',
          coords: centerOf(items[0]!),
        },
        { coords: { clientX: 50, clientY: 120 } },
      ]);
      expect(placeholderIn(container)).toBeDefined();

      controller.destroy();
      await flush();

      expect(placeholderIn(container)).toBeUndefined();
      expect(items[0]!.matches(':popover-open')).toBeFalsy();
    });

    it('should stay silent when destroyed mid-drag', async () => {
      const container = createList(3);
      const items = rows(container);
      const onFinish = vi.fn<(r: SortableFinishResult) => void>();
      const onCancel = vi.fn<(r: SortableCancelResult) => void>();
      const onError = vi.fn<(...a: unknown[]) => void>();
      const controller = sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: accept,
        onFinish,
        onCancel,
        onError,
      });

      await ue.pointer([
        {
          target: items[0]!,
          keys: '[MouseLeft>]',
          coords: centerOf(items[0]!),
        },
        { coords: { clientX: 50, clientY: 120 } },
      ]);
      controller.destroy();
      await flush();

      expect(onFinish).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  /**
   * Document-level session listeners exist only while a gesture is armed.
   * Counted directly: a leaked listener that happens to be inert still
   * accumulates across gestures.
   */
  describe('listener lifetime', () => {
    /** Counts live document listeners by tracking add/remove and abort signals. */
    function trackDocumentListeners(): { live(): number; restore(): void } {
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

    it('should release document listeners when a pending press is disarmed', async () => {
      const container = createList(3);
      const items = rows(container);
      sort(container, { items: () => rows(container), onReorder: accept });
      const tracker = trackDocumentListeners();

      try {
        const before = tracker.live();
        const start = centerOf(items[0]!);
        await ue.pointer([
          { target: items[0]!, keys: '[MouseLeft>]', coords: start },
          {
            coords: { clientX: start.clientX + 2, clientY: start.clientY + 1 },
          },
        ]);
        expect(tracker.live()).toBeGreaterThan(before);

        await ue.pointer({ keys: '[/MouseLeft]', coords: start });
        await flush();

        expect(tracker.live()).toBe(before);
      } finally {
        tracker.restore();
      }
    });

    it('should hold no document listeners once a gesture completes', async () => {
      const container = createList(3);
      const items = rows(container);
      const onFinish = vi.fn<(r: SortableFinishResult) => void>();
      sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: accept,
        onFinish,
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });
      const tracker = trackDocumentListeners();

      try {
        const before = tracker.live();
        const over = centerOf(items[1]!);
        await ue.pointer([
          {
            target: items[0]!,
            keys: '[MouseLeft>]',
            coords: centerOf(items[0]!),
          },
          { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
        ]);
        expect(tracker.live()).toBeGreaterThan(before);

        await ue.pointer({
          keys: '[/MouseLeft]',
          coords: { clientX: over.clientX, clientY: over.clientY + 8 },
        });
        await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce(), {
          timeout: 1000,
        });
        await flush();

        expect(tracker.live()).toBe(before);
      } finally {
        tracker.restore();
      }
    });
  });

  describe('resolution currency', () => {
    it('should ignore an acceptance that arrives after the gesture was canceled', async () => {
      const container = createList(3);
      const items = rows(container);
      let settle!: () => void;
      const onFinish = vi.fn<(r: SortableFinishResult) => void>();
      const onCancel = vi.fn<(r: SortableCancelResult) => void>();
      const controller = sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: () =>
          new Promise<ReorderResolution>((resolve) => {
            settle = () => {
              resolve(ReorderResolution.accept());
            };
          }),
        onFinish,
        onCancel,
      });

      const over = centerOf(items[1]!);
      await ue.pointer([
        {
          target: items[0]!,
          keys: '[MouseLeft>]',
          coords: centerOf(items[0]!),
        },
        { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
      ]);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: over.clientX, clientY: over.clientY + 8 },
      });
      controller.cancel('superseded');
      await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce(), {
        timeout: 1000,
      });

      settle();
      await flush();

      expect(onFinish).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('should abort the resolution signal when the gesture is canceled', async () => {
      const container = createList(3);
      const items = rows(container);
      let aborted = false;
      const controller = sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: (_request, { signal }) => {
          signal.addEventListener('abort', () => {
            aborted = true;
          });
          return new Promise<ReorderResolution>(() => {});
        },
      });

      const over = centerOf(items[1]!);
      await ue.pointer([
        {
          target: items[0]!,
          keys: '[MouseLeft>]',
          coords: centerOf(items[0]!),
        },
        { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
      ]);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: over.clientX, clientY: over.clientY + 8 },
      });
      expect(aborted).toBeFalsy();

      controller.cancel();
      await vi.waitFor(() => expect(aborted).toBeTruthy(), { timeout: 1000 });
    });

    it('should not abort the resolution signal after normal completion', async () => {
      const container = createList(3);
      const items = rows(container);
      let aborted = false;
      const onFinish = vi.fn<(r: SortableFinishResult) => void>();
      sort(container, {
        items: () => rows(container).filter((row) => row.textContent),
        onReorder: (_request, { signal }) => {
          signal.addEventListener('abort', () => {
            aborted = true;
          });
          return ReorderResolution.accept();
        },
        onFinish,
      });

      const over = centerOf(items[1]!);
      await ue.pointer([
        {
          target: items[0]!,
          keys: '[MouseLeft>]',
          coords: centerOf(items[0]!),
        },
        { coords: { clientX: over.clientX, clientY: over.clientY + 8 } },
      ]);
      await ue.pointer({
        keys: '[/MouseLeft]',
        coords: { clientX: over.clientX, clientY: over.clientY + 8 },
      });
      await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce(), {
        timeout: 1000,
      });
      await flush();

      expect(aborted).toBeFalsy();
    });
  });
});
