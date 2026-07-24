import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDLE } from '../../src/kernel/lifecycle.ts';
import {
  CANCEL_ITEM_REMOVED,
  OUTCOME_CANCELED,
} from '../../src/kernel/protocol.ts';
import {
  ReorderResolution,
  type SortableOptions,
} from '../../src/sortable/options.ts';
import { dispatch } from '../../src/sortable/runtime/actions.ts';
import {
  createSortableControllerInternal,
  type SortableController,
} from '../../src/sortable/runtime/controller.ts';
import type { SortableStateFrame } from '../../src/sortable/runtime/frames.ts';
import type { SortableRuntime } from '../../src/sortable/runtime/runtime.ts';

const accept = (): ReorderResolution => ReorderResolution.accept();

const live: SortableController[] = [];

/** A void-returning mock, so it matches the callback slots exactly. */
function voidFn(): ReturnType<typeof vi.fn<(...args: unknown[]) => void>> {
  return vi.fn<(...args: unknown[]) => void>();
}

function sort(
  container: HTMLElement,
  options: SortableOptions,
): Readonly<{ controller: SortableController; runtime: SortableRuntime }> {
  const built = createSortableControllerInternal(container, options);
  live.push(built.controller);
  return built;
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

/** Only the engine's placeholder has no text content. */
const placeholderIn = (container: HTMLElement): HTMLElement | undefined =>
  rows(container).find((row) => !row.textContent);

const itemsOf = (container: HTMLElement): HTMLElement[] =>
  rows(container).filter((row) => row.textContent);

function centerOf(el: HTMLElement): { clientX: number; clientY: number } {
  const r = el.getBoundingClientRect();
  return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
}

/**
 * Drags row 0 down over row 1 without releasing, returning the point it ended
 * at. Callers must release at that point rather than re-measuring a row: the
 * drag has already moved the placeholder, so a fresh measurement reads a layout
 * that has shifted under it.
 */
async function dragOverNeighbour(
  ue: UserEvent,
  items: readonly HTMLElement[],
): Promise<Readonly<{ clientX: number; clientY: number }>> {
  const start = centerOf(items[0]!);
  const over = centerOf(items[1]!);
  const end = { clientX: over.clientX, clientY: over.clientY + 8 };
  await ue.pointer([
    { target: items[0]!, keys: '[MouseLeft>]', coords: start },
    { coords: { clientX: over.clientX, clientY: over.clientY + 5 } },
    { coords: end },
  ]);
  return end;
}

/** Every reference-bearing field of a frame, for retention assertions. */
function references(frame: SortableStateFrame): readonly unknown[] {
  return [
    frame.operation,
    frame.item,
    frame.visual,
    frame.snapshot,
    frame.insertion,
    frame.proposal,
    frame.domain,
    frame.failureError,
    frame.cancelReason,
  ];
}

describe('sortable runtime', () => {
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

  describe('release closes motion but keeps cancellation (D-1)', () => {
    it('should still cancel on Escape while the resolver is pending', async () => {
      const container = createList(3);
      const onCancel = voidFn();
      const onFinish = voidFn();
      let settle!: () => void;
      sort(container, {
        items: () => itemsOf(container),
        onReorder: () =>
          new Promise<ReorderResolution>((resolve) => {
            settle = () => {
              resolve(ReorderResolution.accept());
            };
          }),
        onCancel,
        onFinish,
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      const items = itemsOf(container);
      const end = await dragOverNeighbour(ue, items);
      await ue.pointer({ keys: '[/MouseLeft]', coords: end });
      await flush();

      await ue.keyboard('{Escape}');
      await vi.waitFor(() => {
        expect(onCancel).toHaveBeenCalledOnce();
      });

      // The late acceptance must be inert.
      settle();
      await flush();
      expect(onFinish).not.toHaveBeenCalled();
    });

    it('should not let a post-release pointer move change the proposal', async () => {
      const container = createList(4);
      let request: { from: number; to: number } | null = null;
      sort(container, {
        items: () => itemsOf(container),
        onReorder: (incoming) =>
          new Promise<ReorderResolution>((resolve) => {
            request = { from: incoming.from, to: incoming.to };
            setTimeout(() => {
              resolve(ReorderResolution.accept());
            }, 0);
          }),
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      const items = itemsOf(container);
      const end = await dragOverNeighbour(ue, items);
      await ue.pointer({ keys: '[/MouseLeft]', coords: end });

      // Far past the last row; if motion were still armed this would move the
      // insertion before the resolver settled.
      await ue.pointer({ coords: { clientX: 50, clientY: 400 } });
      await flush();

      expect(request).not.toBeNull();
      expect(request!.from).toBe(0);
      expect(request!.to).toBe(1);
    });
  });

  describe('cancellation during activation (L-9)', () => {
    it('should abandon a pending press silently', async () => {
      const container = createList(3);
      const onCancel = voidFn();
      const onError = voidFn();
      const onStart = voidFn();
      const { controller, runtime } = sort(container, {
        items: () => itemsOf(container),
        onReorder: accept,
        onCancel,
        onError,
        onStart,
      });

      const items = itemsOf(container);
      await ue.pointer({
        target: items[0]!,
        keys: '[MouseLeft>]',
        coords: centerOf(items[0]!),
      });
      controller.cancel('before-threshold');
      await flush();

      expect(onStart).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(runtime.current.phase).toBe(IDLE);
    });

    it('should settle through onCancel once activation resources are held', async () => {
      const container = createList(3);
      const onCancel = voidFn();
      const onError = voidFn();
      sort(container, {
        items: () => itemsOf(container),
        onReorder: accept,
        onCancel,
        onError,
        // Cancel from inside onStart: resources are committed by then.
        onStart: () => {
          live.at(-1)!.cancel('during-start');
        },
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      const items = itemsOf(container);
      await dragOverNeighbour(ue, items);
      await vi.waitFor(() => {
        expect(onCancel).toHaveBeenCalledOnce();
      });

      // A cancellation is never reported as an activation failure.
      expect(onError).not.toHaveBeenCalled();
      expect(onCancel.mock.calls[0]![0]).toMatchObject({
        type: OUTCOME_CANCELED,
      });
    });
  });

  describe('collection changes', () => {
    it('should rebase onto a surviving gap while active', async () => {
      const container = createList(4);
      const onCancel = voidFn();
      const { controller } = sort(container, {
        items: () => itemsOf(container),
        onReorder: accept,
        onCancel,
      });

      const items = itemsOf(container);
      await dragOverNeighbour(ue, items);

      // Append a row at the end: the incumbent gap's neighbours are untouched.
      const extra = document.createElement('div');
      extra.textContent = 'row extra';
      extra.style.height = '40px';
      container.append(extra);
      controller.updateItems(itemsOf(container));
      await flush();

      expect(onCancel).not.toHaveBeenCalled();
      expect(placeholderIn(container)).toBeDefined();
    });

    it('should cancel when the dragged item leaves the collection', async () => {
      const container = createList(3);
      const onCancel = voidFn();
      const { controller } = sort(container, {
        items: () => itemsOf(container),
        onReorder: accept,
        onCancel,
      });

      const items = itemsOf(container);
      await dragOverNeighbour(ue, items);

      items[0]!.remove();
      controller.updateItems(itemsOf(container));
      await vi.waitFor(() => {
        expect(onCancel).toHaveBeenCalledOnce();
      });

      expect(onCancel.mock.calls[0]![0]).toMatchObject({
        type: OUTCOME_CANCELED,
        reason: { type: CANCEL_ITEM_REMOVED },
      });
    });

    it('should ignore a replacement once the consumer is resolving', async () => {
      const container = createList(4);
      let request: { from: number; to: number } | null = null;
      const { controller } = sort(container, {
        items: () => itemsOf(container),
        onReorder: (incoming) =>
          new Promise<ReorderResolution>((resolve) => {
            request = { from: incoming.from, to: incoming.to };
            setTimeout(() => {
              resolve(ReorderResolution.accept());
            }, 0);
          }),
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      const items = itemsOf(container);
      const end = await dragOverNeighbour(ue, items);
      await ue.pointer({ keys: '[/MouseLeft]', coords: end });

      controller.updateItems(itemsOf(container).toReversed());
      await flush();

      // The proposal the consumer was asked about is unchanged.
      expect(request).toMatchObject({ from: 0, to: 1 });
    });
  });

  describe('keyboard commands', () => {
    it('should reorder one slot on ArrowDown', async () => {
      const container = createList(3);
      const onFinish = voidFn();
      let request: { from: number; to: number } | null = null;
      sort(container, {
        items: () => itemsOf(container),
        onReorder: (incoming) => {
          request = { from: incoming.from, to: incoming.to };
          return ReorderResolution.accept();
        },
        onFinish,
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      const items = itemsOf(container);
      items[0]!.tabIndex = 0;
      items[0]!.focus();
      await ue.keyboard('{ArrowDown}');
      await vi.waitFor(() => {
        expect(onFinish).toHaveBeenCalledOnce();
      });

      expect(request).toMatchObject({ from: 0, to: 1 });
    });

    it('should stay inert at the collection edge', async () => {
      const container = createList(3);
      const onReorder = vi.fn(accept);
      sort(container, {
        items: () => itemsOf(container),
        onReorder,
      });

      const items = itemsOf(container);
      items[0]!.tabIndex = 0;
      items[0]!.focus();
      await ue.keyboard('{ArrowUp}');
      await flush();

      expect(onReorder).not.toHaveBeenCalled();
    });
  });

  describe('retention', () => {
    it('should scrub both frames after a completed reorder', async () => {
      const container = createList(3);
      const onFinish = voidFn();
      const { runtime } = sort(container, {
        items: () => itemsOf(container),
        onReorder: accept,
        onFinish,
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      const items = itemsOf(container);
      const end = await dragOverNeighbour(ue, items);
      await ue.pointer({ keys: '[/MouseLeft]', coords: end });
      await vi.waitFor(() => {
        expect(onFinish).toHaveBeenCalledOnce();
      });

      expect(runtime.current.phase).toBe(IDLE);
      expect(references(runtime.current).every((value) => value === null)).toBe(
        true,
      );
      expect(references(runtime.draft).every((value) => value === null)).toBe(
        true,
      );
      expect(runtime.placeholder).toBeNull();
      expect(runtime.lift).toBeNull();
      expect(runtime.lifetimes).toBeNull();
    });

    it('should empty the geometry cache of element references', async () => {
      const container = createList(4);
      const onFinish = voidFn();
      const { runtime } = sort(container, {
        items: () => itemsOf(container),
        onReorder: accept,
        onFinish,
        landingTiming: () => ({ duration: 0, easing: 'linear' }),
      });

      const items = itemsOf(container);
      const end = await dragOverNeighbour(ue, items);
      await ue.pointer({ keys: '[/MouseLeft]', coords: end });
      await vi.waitFor(() => {
        expect(onFinish).toHaveBeenCalledOnce();
      });

      expect(runtime.rects.items).toHaveLength(0);
      expect(runtime.rects.count).toBe(0);
    });

    it('should remove the placeholder and clear state on destroy mid-drag', async () => {
      const container = createList(3);
      const { controller, runtime } = sort(container, {
        items: () => itemsOf(container),
        onReorder: accept,
      });

      const items = itemsOf(container);
      await dragOverNeighbour(ue, items);
      expect(placeholderIn(container)).toBeDefined();

      controller.destroy();

      expect(placeholderIn(container)).toBeUndefined();
      expect(runtime.closed).toBe(true);
      expect(runtime.actions).toHaveLength(0);
      expect(references(runtime.current).every((value) => value === null)).toBe(
        true,
      );
    });

    it('should abort controller ingress on panic', async () => {
      const container = createList(3);
      const onStart = voidFn();
      const { runtime } = sort(container, {
        items: () => itemsOf(container),
        onReorder: accept,
        onStart,
      });
      const reported = vi
        .spyOn(window, 'reportError')
        .mockImplementation(() => {});

      dispatch(runtime, 9999);

      expect(reported).toHaveBeenCalledOnce();
      reported.mockRestore();
      expect(runtime.closed).toBe(true);
      expect(runtime.ingress.signal.aborted).toBe(true);

      await dragOverNeighbour(ue, itemsOf(container));
      expect(onStart).not.toHaveBeenCalled();
    });
  });
});
