import userEvent, { type UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useShadowDOM } from '../../src/controllers/useShadowDOM.ts';
import { ControlledElement, internals } from '../../src/element.ts';
import { impl } from '../../src/traits/attributes.ts';
import {
  Reorderable,
  ReorderEvent,
  useReorderable,
  useReorderableItem,
} from '../../src/traits/reorderable.ts';
import { defineCE, host, nameCE, nextFrame } from '../browser.ts';

function createListTemplate(): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = '<slot></slot>';
  return template;
}

const ReorderableCore = impl(ControlledElement, [Reorderable] as const);

function createList() {
  return host((h) => {
    useShadowDOM(h, [createListTemplate()], []);
    useReorderable(h, { duration: 200, easing: 'ease-out' });
  }, ReorderableCore);
}

function createItem() {
  return host((h) => {
    useReorderableItem(h);
  });
}

function createReorderEvent(): ReorderEvent {
  return new ReorderEvent(document.createElement('div'), 0, 1);
}

describe('ReorderEvent', () => {
  it('should bubble', () => {
    expect(createReorderEvent().bubbles).toBeTruthy();
  });

  it('should cross shadow DOM boundaries', () => {
    expect(createReorderEvent().composed).toBeTruthy();
  });

  it('should not be cancelable after the reorder lands', () => {
    expect(createReorderEvent().cancelable).toBeFalsy();
  });
});

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
  let ue: UserEvent;

  beforeEach(() => {
    ue = userEvent.setup();
  });

  it('should not set dragged state when reorderable is false', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    await nextFrame();

    await ue.pointer([{ target: item, keys: '[MouseLeft>]' }]);

    expect(internals(item).states.has('dragged')).toBeFalsy();
  });

  it('should set dragged state on pointerdown when reorderable is true', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([{ target: item, keys: '[MouseLeft>]' }]);

    expect(internals(item).states.has('drag')).toBeTruthy();
  });

  it('should create a footprint placeholder on pointerdown', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([{ target: item, keys: '[MouseLeft>]' }]);

    expect(list.querySelector('[data-footprint]')).not.toBeNull();
  });

  it('should move footprint on pointermove when sibling midpoint is crossed', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
    ]);

    const fp = list.querySelector<HTMLElement>('[data-footprint]')!;

    // Move pointer well below item2 so footprint moves after it
    await ue.pointer([{ coords: { clientY: 9999 } }]);

    // Wait for the rAF inside the pointermove handler to reposition the footprint
    await nextFrame();

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
    await nextFrame();

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    // Drag item1 past item3 and release
    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
      { keys: '[/MouseLeft]' },
    ]);

    // Wait for the animation to finish and the event to fire
    await vi.waitFor(() => expect(reorderSpy).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

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
    await nextFrame();

    const reorderSpy: Mock<EventListener> = vi.fn();
    list.addEventListener('reorder', reorderSpy);

    await ue.pointer([{ target: list, keys: '[MouseLeft]' }]);

    expect(reorderSpy).not.toHaveBeenCalled();
  });

  it('should clear dragged state on pointercancel', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([{ target: item, keys: '[MouseLeft>]' }]);

    const fp = list.querySelector<HTMLElement>('[data-footprint]')!;
    fp.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, composed: true }),
    );

    await nextFrame();

    expect(internals(item).states.has('dragged')).toBeFalsy();
  });
});
