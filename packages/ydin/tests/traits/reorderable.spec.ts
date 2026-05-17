import { describe, expect, it, vi } from 'vitest';
import {
  createContext,
  type Context,
} from '../../src/controllers/useContext.ts';
import { useShadowDOM } from '../../src/controllers/useShadowDOM.ts';
import { ControlledElement, internals } from '../../src/element.ts';
import {
  Reorderable,
  useReorderable,
  useReorderableItem,
  type ReorderableContextData,
} from '../../src/traits/reorderable.ts';
import { impl } from '../../src/traits/traits.ts';
import { ReorderEvent } from '../../src/utils/events.ts';
import { defineCE, nextFrame, host, nameCE } from '../browser.ts';

function createCtx(): Context<ReorderableContextData> {
  return createContext<ReorderableContextData>();
}

function createListTemplate(): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = '<slot></slot>';
  return template;
}

const ReorderableCore = impl(ControlledElement, [Reorderable] as const);

function createList(ctx: Context<ReorderableContextData>) {
  return host(
    {
      init(h) {
        useShadowDOM(h, [createListTemplate()], []);
        useReorderable(h, ctx);
      },
    },
    ReorderableCore,
  );
}

function createItem(ctx: Context<ReorderableContextData>) {
  return host({
    init(h) {
      useReorderableItem(h, ctx);
    },
  });
}

function dispatchDrag(target: HTMLElement, type: string) {
  target.dispatchEvent(
    new DragEvent(type, { bubbles: true, composed: true, cancelable: true }),
  );
}

describe('Reorderable', () => {
  it('should read reorderable as false when attribute is absent', () => {
    defineCE(nameCE(), ReorderableCore);

    expect(new ReorderableCore().reorderable).toBeFalsy();
  });

  it('should read reorderable as true when attribute is present', () => {
    const el = new ReorderableCore();
    el.setAttribute('reorderable', '');

    expect(el.reorderable).toBeTruthy();
  });

  it('should write reorderable via the accessor', () => {
    const el = new ReorderableCore();
    el.reorderable = true;

    expect(el.getAttribute('reorderable')).toBe('');

    el.reorderable = false;

    expect(el.getAttribute('reorderable')).toBeNull();
  });
});

describe('useReorderableItem', () => {
  it('should set draggable to false when no context is present', () => {
    const ctx = createCtx();
    const item = createItem(ctx);

    document.body.append(item);

    expect(item.draggable).toBeFalsy();
  });

  it('should set draggable to false when parent is not reorderable', () => {
    const ctx = createCtx();
    const list = createList(ctx);
    const item = createItem(ctx);

    document.body.append(list);
    list.append(item);

    expect(item.draggable).toBeFalsy();
  });

  it('should set draggable to true when parent becomes reorderable', () => {
    const ctx = createCtx();
    const list = createList(ctx);
    const item = createItem(ctx);

    document.body.append(list);
    list.append(item);
    list.reorderable = true;

    expect(item.draggable).toBeTruthy();
  });

  it('should set draggable to false when parent stops being reorderable', () => {
    const ctx = createCtx();
    const list = createList(ctx);
    const item = createItem(ctx);

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    list.reorderable = false;

    expect(item.draggable).toBeFalsy();
  });

  it('should cancel dragstart when no data-handle is in the composed path', () => {
    const ctx = createCtx();
    const item = createItem(ctx);

    document.body.append(item);

    const event = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
    });
    item.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTruthy();
  });

  it('should allow dragstart when a data-handle element is in the composed path', () => {
    const ctx = createCtx();
    const item = createItem(ctx);
    const handle = document.createElement('span');

    handle.dataset['handle'] = '';
    item.append(handle);
    document.body.append(item);

    const event = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
    });
    handle.dispatchEvent(event);

    expect(event.defaultPrevented).toBeFalsy();
  });
});

describe('useReorderable', () => {
  it('should not set dragged state when reorderable is false', async () => {
    const ctx = createCtx();
    const list = createList(ctx);
    const item = createItem(ctx);

    document.body.append(list);
    list.append(item);
    await nextFrame();

    dispatchDrag(item, 'dragstart');

    expect(
      internals(item as unknown as ControlledElement).states.has('dragged'),
    ).toBeFalsy();
  });

  it('should set dragged state on dragstart when reorderable is true', async () => {
    const ctx = createCtx();
    const list = createList(ctx);
    const item = createItem(ctx);

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    dispatchDrag(item, 'dragstart');

    expect(
      internals(item as unknown as ControlledElement).states.has('dragged'),
    ).toBeTruthy();
  });

  it('should set drag-over state on dragover for the target item', async () => {
    const ctx = createCtx();
    const list = createList(ctx);
    const item1 = createItem(ctx);
    const item2 = createItem(ctx);

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await nextFrame();

    dispatchDrag(item1, 'dragstart');
    dispatchDrag(item2, 'dragover');

    expect(
      internals(item2 as unknown as ControlledElement).states.has('drag-over'),
    ).toBeTruthy();
  });

  it('should clear drag-over state on dragleave', async () => {
    const ctx = createCtx();
    const list = createList(ctx);
    const item1 = createItem(ctx);
    const item2 = createItem(ctx);

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await nextFrame();

    dispatchDrag(item1, 'dragstart');
    dispatchDrag(item2, 'dragover');
    dispatchDrag(list, 'dragleave');

    expect(
      internals(item2 as unknown as ControlledElement).states.has('drag-over'),
    ).toBeFalsy();
  });

  it('should clear all drag states on dragend', async () => {
    const ctx = createCtx();
    const list = createList(ctx);
    const item1 = createItem(ctx);
    const item2 = createItem(ctx);

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await nextFrame();

    dispatchDrag(item1, 'dragstart');
    dispatchDrag(item2, 'dragover');
    dispatchDrag(item1, 'dragend');

    expect(
      internals(item1 as unknown as ControlledElement).states.has('dragged'),
    ).toBeFalsy();
    expect(
      internals(item2 as unknown as ControlledElement).states.has('drag-over'),
    ).toBeFalsy();
  });

  it('should dispatch ReorderEvent with correct indices on drop', async () => {
    const ctx = createCtx();
    const list = createList(ctx);
    const item1 = createItem(ctx);
    const item2 = createItem(ctx);
    const item3 = createItem(ctx);

    document.body.append(list);
    list.append(item1, item2, item3);
    list.reorderable = true;
    await nextFrame();

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    dispatchDrag(item1, 'dragstart');
    dispatchDrag(item3, 'dragover');
    dispatchDrag(list, 'drop');

    expect(reorderSpy).toHaveBeenCalledOnce();

    const event = reorderSpy.mock.calls[0]?.[0];
    expect(event).toBeInstanceOf(ReorderEvent);

    const reorderEvent = event as ReorderEvent;
    expect(reorderEvent.item).toBe(item1);
    expect(reorderEvent.fromIndex).toBe(0);
    expect(reorderEvent.toIndex).toBe(2);
  });

  it('should not dispatch ReorderEvent when no drag target was set', async () => {
    const ctx = createCtx();
    const list = createList(ctx);
    const item1 = createItem(ctx);

    document.body.append(list);
    list.append(item1);
    list.reorderable = true;
    await nextFrame();

    const reorderSpy = vi.fn();
    list.addEventListener('reorder', reorderSpy);

    dispatchDrag(list, 'drop');

    expect(reorderSpy).not.toHaveBeenCalled();
  });
});
