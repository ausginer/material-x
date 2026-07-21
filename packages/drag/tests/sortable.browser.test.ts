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

    /** The engine's placeholder is the only child without text content. */
    const placeholderIn = (container: HTMLElement): HTMLElement | undefined =>
      rows(container).find((row) => !row.textContent);

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
});
