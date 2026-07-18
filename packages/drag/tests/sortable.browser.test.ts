import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReorderRequest } from '../src/kernel/types.ts';
import type { ReorderFinish } from '../src/sortable/options.ts';
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
    const onFinish =
      vi.fn<(item: HTMLElement, outcome: ReorderFinish) => void>();
    sortable(container, {
      items: () => items,
      onReorder: reject,
      onFinish,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await dragToEnd(ue, items[0]!);

    await vi.waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith(items[0]!, 'rejected');
    });
  });

  it('should finish committed once the consumer commits synchronously', async () => {
    const { container, items } = createList(3);
    const onFinish =
      vi.fn<(item: HTMLElement, outcome: ReorderFinish) => void>();
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
      expect(onFinish).toHaveBeenCalledWith(expect.anything(), 'committed');
    });
  });

  it('should finish committed when the consumer commits asynchronously', async () => {
    const { container, items } = createList(3);
    const onFinish =
      vi.fn<(item: HTMLElement, outcome: ReorderFinish) => void>();
    const controller = sortable(container, {
      items: () => items,
      onReorder(request) {
        // The commit lands a frame later, after the drop resolves — the session
        // must hold through `awaiting-commit` until `updateItems` reports it.
        return new Promise((resolve) => {
          requestAnimationFrame(() => {
            const rest = items.filter((item) => item !== request.item);
            rest.splice(request.to, 0, request.item);
            container.insertBefore(
              request.item,
              container.children[request.to] ?? null,
            );
            items.splice(0, items.length, ...rest);
            controller.updateItems(items);
            resolve({ accepted: true });
          });
        });
      },
      onFinish,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await dragToEnd(ue, items[0]!);

    await vi.waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith(expect.anything(), 'committed');
    });
  });

  it('should finish accepted-but-uncommitted when no commit is observed', async () => {
    const { container, items } = createList(3);
    const onFinish =
      vi.fn<(item: HTMLElement, outcome: ReorderFinish) => void>();
    sortable(container, {
      // Accept the reorder but never move the DOM or call updateItems, so the
      // commit wait times out and the outcome is `accepted`, not `committed`.
      items: () => items,
      onReorder: () => ({ accepted: true }),
      onFinish,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await dragToEnd(ue, items[0]!);

    await vi.waitFor(
      () => {
        expect(onFinish).toHaveBeenCalledWith(items[0]!, 'accepted');
      },
      { timeout: 2000 },
    );
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

  it('should install the touch-action policy on the container upfront', () => {
    const { container, items } = createList(2);
    const controller = sortable(container, {
      items: () => items,
      touchAction: 'none',
    });

    expect(container.style.touchAction).toBe('none');

    controller.destroy();

    expect(container.style.touchAction).toBe('');
  });

  it('should forward the cancel reason to onCancel', async () => {
    const { container, items } = createList(3);
    const onCancel = vi.fn<(item: HTMLElement, reason: unknown) => void>();
    const controller = sortable(container, {
      items: () => items,
      onCancel,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await ue.pointer([
      {
        target: items[0]!,
        keys: '[MouseLeft>]',
        coords: { clientX: 20, clientY: 10 },
      },
      { coords: { clientX: 20, clientY: 9999 } },
    ]);
    await nextFrame();

    await controller.cancel('nope');

    expect(onCancel).toHaveBeenCalledWith(items[0]!, 'nope');
  });

  it('should not accumulate global scroll listeners across drags', async () => {
    const { container, items } = createList(2);
    const scrollSignals: AbortSignal[] = [];
    const original = window.addEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (type, listener, options) => {
        if (
          type === 'scroll' &&
          options &&
          typeof options === 'object' &&
          options.signal
        ) {
          scrollSignals.push(options.signal);
        }

        return original(type, listener, options);
      },
    );

    sortable(container, {
      items: () => items,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    const drag = async (): Promise<void> => {
      await ue.pointer([
        {
          target: items[0]!,
          keys: '[MouseLeft>]',
          coords: { clientX: 20, clientY: 10 },
        },
        { coords: { clientX: 20, clientY: 9999 } },
      ]);
      await nextFrame();
      await ue.pointer([{ keys: '[/MouseLeft]' }]);
      await vi.waitFor(() => {
        expect(container.querySelector('[data-drag-placeholder]')).toBeNull();
      });
    };

    await drag();
    await drag();

    vi.restoreAllMocks();

    // Each drag registers exactly one scroll listener, and every one is torn
    // down (its per-drag signal aborted) rather than left live for the next.
    expect(scrollSignals).toHaveLength(2);
    expect(scrollSignals.every((signal) => signal.aborted)).toBeTruthy();
  });

  it('should measure items added through updateItems during a drag', async () => {
    const { container, items } = createList(2);
    const onReorder = vi.fn<(request: ReorderRequest) => undefined>(
      () => undefined,
    );
    const list = [...items];
    const controller = sortable(container, {
      items: () => list,
      onReorder,
      landingTiming: () => ({ duration: 0, easing: 'linear' }),
    });

    await ue.pointer([
      {
        target: items[0]!,
        keys: '[MouseLeft>]',
        coords: { clientX: 20, clientY: 10 },
      },
      { coords: { clientX: 20, clientY: 60 } },
    ]);
    await nextFrame();

    // Add a third item below and publish it mid-drag.
    const third = document.createElement('div');
    third.style.display = 'block';
    third.style.height = '50px';
    container.append(third);
    list.push(third);
    controller.updateItems(list);

    // Drive the pointer past the newly added item; it must be hit-tested.
    await ue.pointer([{ coords: { clientX: 20, clientY: 9999 } }]);
    await nextFrame();
    await ue.pointer([{ keys: '[/MouseLeft]' }]);

    expect(onReorder).toHaveBeenCalled();
    const [request] = onReorder.mock.calls.at(-1)!;
    // Dragged to the very end of the now three-item collection.
    expect(request.to).toBe(2);
  });
});
