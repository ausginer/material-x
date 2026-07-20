import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sortable,
  type ReorderRequest,
  type ReorderResolution,
  type SortableCancelResult,
  type SortableController,
  type SortableFinishResult,
  type SortableOptions,
} from '../src/sortable.ts';

const accept = (): ReorderResolution => ({ type: 'accepted' });

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
      (_request: ReorderRequest): ReorderResolution => ({ type: 'accepted' }),
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
    expect(onFinish.mock.calls[0]![0].type).toBe('accepted');
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
    expect(onFinish.mock.calls[0]![0].type).toBe('no-op');
  });

  it('should route an explicit rejection through onCancel', async () => {
    const container = createList(3);
    const items = rows(container);
    const onCancel = vi.fn<(r: SortableCancelResult) => void>();
    const onError = vi.fn<(...a: unknown[]) => void>();
    sort(container, {
      items: () => rows(container),
      onReorder: () => ({ type: 'rejected', reason: 'no' }),
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
    await flush();

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCancel.mock.calls[0]![0].type).toBe('rejected');
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
    await flush();

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCancel.mock.calls[0]![0].type).toBe('canceled');
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
    await flush();

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCancel.mock.calls[0]![0].type).toBe('canceled');
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
});
