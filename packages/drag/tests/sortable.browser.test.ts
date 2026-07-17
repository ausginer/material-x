import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReorderRequest } from '../src/kernel/types.ts';
import { sortable } from '../src/sortable.ts';

const reject = (_request: ReorderRequest) => ({ accepted: false });

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/** A vertical list of `count` stacked 50px items appended to the body. */
function createList(count: number): {
  container: HTMLElement;
  items: HTMLElement[];
} {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100px';

  const items = Array.from({ length: count }, () => {
    const item = document.createElement('div');
    item.style.display = 'block';
    item.style.height = '50px';
    container.append(item);
    return item;
  });

  document.body.append(container);
  return { container, items };
}

/** A user-event drag from `item` down past the whole list, released. */
async function dragToEnd(ue: UserEvent, item: HTMLElement): Promise<void> {
  await ue.pointer([
    {
      target: item,
      keys: '[MouseLeft>]',
      coords: { clientX: 20, clientY: 10 },
    },
    { coords: { clientX: 20, clientY: 9999 } },
  ]);
  await nextFrame();
  await ue.pointer([{ keys: '[/MouseLeft]' }]);
}

describe('sortable', () => {
  let ue: UserEvent;

  beforeEach(() => {
    ue = userEvent.setup();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('should lift the dragged item into the top layer on activation', async () => {
    const { container, items } = createList(2);
    sortable(container, { items: () => items });

    await ue.pointer([
      {
        target: items[0]!,
        keys: '[MouseLeft>]',
        coords: { clientX: 20, clientY: 10 },
      },
      { coords: { clientX: 20, clientY: 9999 } },
    ]);

    expect(items[0]!.matches(':popover-open')).toBeTruthy();
  });

  it('should insert an internal anchor when no placeholder is provided', async () => {
    const { container, items } = createList(2);
    sortable(container, { items: () => items });

    await ue.pointer([
      {
        target: items[0]!,
        keys: '[MouseLeft>]',
        coords: { clientX: 20, clientY: 10 },
      },
      { coords: { clientX: 20, clientY: 9999 } },
    ]);

    expect(container.querySelector('[data-drag-placeholder]')).not.toBeNull();
  });

  it('should use a consumer-provided placeholder element', async () => {
    const { container, items } = createList(2);
    const createPlaceholder = vi.fn(() => {
      const el = document.createElement('div');
      el.setAttribute('data-custom', '');
      return el;
    });
    sortable(container, { items: () => items, createPlaceholder });

    await ue.pointer([
      {
        target: items[0]!,
        keys: '[MouseLeft>]',
        coords: { clientX: 20, clientY: 10 },
      },
      { coords: { clientX: 20, clientY: 9999 } },
    ]);

    expect(createPlaceholder).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-custom]')).not.toBeNull();
  });

  it('should propose a reorder with the moved indices on drop', async () => {
    const { container, items } = createList(3);
    const onReorder = vi.fn((_request: ReorderRequest) => undefined);
    sortable(container, {
      items: () => items,
      onReorder,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await dragToEnd(ue, items[0]!);

    expect(onReorder).toHaveBeenCalledOnce();
    const [request] = onReorder.mock.calls[0]!;
    expect(request.from).toBe(0);
    expect(request.to).toBe(2);
    expect(request.item).toBe(items[0]!);
  });

  it('should not propose a reorder for a no-op drop', async () => {
    const { container, items } = createList(3);
    const onReorder = vi.fn((_request: ReorderRequest) => undefined);
    sortable(container, {
      items: () => items,
      onReorder,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await ue.pointer([
      {
        target: items[0]!,
        keys: '[MouseLeft>]',
        coords: { clientX: 20, clientY: 10 },
      },
      { coords: { clientX: 20, clientY: 12 } },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onReorder).not.toHaveBeenCalled();
  });

  it('should finish rejected when the consumer rejects the reorder', async () => {
    const { container, items } = createList(3);
    const onFinish = vi.fn<(item: HTMLElement, accepted: boolean) => void>();
    sortable(container, {
      items: () => items,
      onReorder: reject,
      onFinish,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await dragToEnd(ue, items[0]!);

    await vi.waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith(items[0]!, false);
    });
  });

  it('should settle once the consumer commits the reorder', async () => {
    const { container, items } = createList(3);
    const onFinish = vi.fn<(item: HTMLElement, accepted: boolean) => void>();
    const controller = sortable(container, {
      items: () => items,
      onReorder(request) {
        // Simulate a controlled consumer: move the DOM node and update items.
        const rest = items.filter((item) => item !== request.item);
        rest.splice(request.to, 0, request.item);
        container.insertBefore(
          request.item,
          container.children[request.to] ?? null,
        );
        items.splice(0, items.length, ...rest);
        controller.updateItems(items);
      },
      onFinish,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await dragToEnd(ue, items[0]!);

    await vi.waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith(expect.anything(), true);
    });
  });

  it('should restore the item when destroyed mid-drag', async () => {
    const { container, items } = createList(2);
    const controller = sortable(container, { items: () => items });

    await ue.pointer([
      {
        target: items[0]!,
        keys: '[MouseLeft>]',
        coords: { clientX: 20, clientY: 10 },
      },
      { coords: { clientX: 20, clientY: 9999 } },
    ]);
    await nextFrame();

    expect(items[0]!.matches(':popover-open')).toBeTruthy();

    controller.destroy();

    expect(items[0]!.matches(':popover-open')).toBeFalsy();
    expect(container.querySelector('[data-drag-placeholder]')).toBeNull();
  });
});
