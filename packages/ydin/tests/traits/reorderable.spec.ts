import { describe, expect, it, vi, type Mock } from 'vitest';
import { useShadowDOM } from '../../src/controllers/useShadowDOM.ts';
import { ControlledElement, internals } from '../../src/element.ts';
import {
  Reorderable,
  ReorderEvent,
  useReorderable,
  useReorderableItem,
} from '../../src/traits/reorderable.ts';
import { impl } from '../../src/traits/traits.ts';
import { defineCE, flushDOM, host, nameCE } from '../browser.ts';

function createListTemplate(): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = '<slot></slot>';
  return template;
}

const ReorderableCore = impl(ControlledElement, [Reorderable] as const);

function createList() {
  return host(
    {
      init(h) {
        useShadowDOM(h, [createListTemplate()], []);
        useReorderable(h, { duration: 200, easing: 'ease-out' });
      },
    },
    ReorderableCore,
  );
}

function createItem() {
  return host({
    init(h) {
      useReorderableItem(h);
    },
  });
}

function pointerdown(target: HTMLElement, clientY = 50, pointerId = 1) {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId,
      clientX: 0,
      clientY,
    }),
  );
}

function pointermove(target: HTMLElement, clientY: number, pointerId = 1) {
  target.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      composed: true,
      pointerId,
      clientX: 0,
      clientY,
    }),
  );
}

function pointerup(target: HTMLElement, pointerId = 1) {
  target.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      composed: true,
      pointerId,
    }),
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

describe('useReorderable', () => {
  it('should not set dragged state when reorderable is false', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    await flushDOM();

    pointerdown(item);

    expect(
      internals(item as unknown as ControlledElement).states.has('dragged'),
    ).toBeFalsy();
  });

  it('should set dragged state on pointerdown when reorderable is true', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await flushDOM();

    pointerdown(item);

    expect(
      internals(item as unknown as ControlledElement).states.has('dragged'),
    ).toBeTruthy();
  });

  it('should create a footprint placeholder on pointerdown', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await flushDOM();

    pointerdown(item);

    expect(list.querySelector('.drag-footprint')).not.toBeNull();
  });

  it('should move footprint on pointermove when sibling midpoint is crossed', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await flushDOM();

    pointerdown(item1, 10);

    const fp = list.querySelector('.drag-footprint')!;

    // Move pointer well below item2 so footprint moves after it
    pointermove(fp as HTMLElement, 9999);

    // Footprint should now be last child (after item2)
    expect(list.lastElementChild).toBe(fp);
  });

  it('should dispatch ReorderEvent with correct indices on pointerup', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();
    const item3 = createItem();

    document.body.append(list);
    list.append(item1, item2, item3);
    list.reorderable = true;
    await flushDOM();

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    pointerdown(item1, 10);

    const fp = list.querySelector('.drag-footprint') as HTMLElement;

    // Move footprint after item3
    pointermove(fp, 9999);
    pointerup(fp);

    // Wait for the 200ms animation to finish
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 250);
    });

    expect(reorderSpy).toHaveBeenCalledOnce();

    const event = reorderSpy.mock.calls[0]?.[0] as ReorderEvent;
    expect(event).toBeInstanceOf(ReorderEvent);
    expect(event.item).toBe(item1);
    expect(event.from).toBe(0);
    expect(event.to).toBe(2);
  });

  it('should not dispatch ReorderEvent when no drag is active', async () => {
    const list = createList();
    const item1 = createItem();

    document.body.append(list);
    list.append(item1);
    list.reorderable = true;
    await flushDOM();

    const reorderSpy: Mock<EventListener> = vi.fn();
    list.addEventListener('reorder', reorderSpy);

    pointerup(list);

    expect(reorderSpy).not.toHaveBeenCalled();
  });

  it('should clear dragged state on pointercancel', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await flushDOM();

    pointerdown(item);

    const fp = list.querySelector('.drag-footprint') as HTMLElement;
    fp.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, composed: true }),
    );

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 250);
    });

    expect(
      internals(item as unknown as ControlledElement).states.has('dragged'),
    ).toBeFalsy();
  });
});
