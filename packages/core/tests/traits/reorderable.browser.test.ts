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
    useReorderable(h, () => ({ duration: 200, easing: 'ease-out' }));
  }, ReorderableCore);
}

function createItem() {
  return host((h) => {
    useReorderableItem(h);
  });
}

function createHandleItem() {
  const item = createItem();
  const handle = document.createElement('span');
  handle.dataset['handle'] = '';
  item.append(handle);
  return item;
}

function grip(item: HTMLElement): HTMLElement {
  return item.querySelector<HTMLElement>('[data-handle]')!;
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

    expect(internals(item).states.has('drag')).toBeFalsy();
  });

  it('should set dragged state once the drag activates', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);

    expect(internals(item).states.has('drag')).toBeTruthy();
  });

  it('should not set dragged state before the threshold is crossed', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 13 } },
    ]);

    expect(internals(item).states.has('drag')).toBeFalsy();
    expect(list.querySelector('[data-footprint]')).toBeNull();
  });

  it('should create a footprint placeholder once the drag activates', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);

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

    // Move pointer well below item2 so the drag activates and the footprint
    // moves after it.
    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
    ]);

    // Wait for the rAF inside the pointermove handler to reposition the footprint
    await nextFrame();

    const fp = list.querySelector<HTMLElement>('[data-footprint]')!;

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

  it('should not reorder the DOM itself on drop, leaving that to the consumer', async () => {
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

    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
      { keys: '[/MouseLeft]' },
    ]);

    await vi.waitFor(() => expect(reorderSpy).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    // The trait reports from/to but never moves the item — sibling order is
    // exactly as it started, and the footprint is gone.
    expect([...list.children]).toStrictEqual([item1, item2, item3]);
  });

  it('should not dispatch ReorderEvent on pointercancel after movement', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await nextFrame();

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
    ]);
    await nextFrame();

    list.dispatchEvent(
      new PointerEvent('pointercancel', {
        pointerId: 1,
        bubbles: true,
        composed: true,
      }),
    );
    await nextFrame();

    expect(reorderSpy).not.toHaveBeenCalled();
  });

  it('should restore the item and remove the footprint on pointercancel after movement', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
    ]);
    await nextFrame();

    list.dispatchEvent(
      new PointerEvent('pointercancel', {
        pointerId: 1,
        bubbles: true,
        composed: true,
      }),
    );
    await nextFrame();

    expect(list.querySelector('[data-footprint]')).toBeNull();
    expect([...list.children]).toStrictEqual([item1, item2]);
    expect(internals(item1).states.has('drag')).toBeFalsy();
  });

  it('should re-hit-test after activation when the pointer returns near the origin', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();

    // Real, stacked heights so the sibling midpoints are meaningful — otherwise
    // the zero-height custom elements collapse every midpoint onto the top edge.
    list.style.display = 'block';
    for (const item of [item1, item2]) {
      item.style.display = 'block';
      item.style.height = '50px';
    }

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await nextFrame();

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    // Drag to the bottom, then return to the starting point and release. The
    // threshold must only gate the first activation, so the footprint follows
    // back and the item lands where it started (to === from).
    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
    ]);
    await nextFrame();
    await ue.pointer([{ coords: { clientY: 10 } }]);
    await nextFrame();
    await ue.pointer([{ keys: '[/MouseLeft]' }]);

    await vi.waitFor(() => expect(reorderSpy).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    const event = reorderSpy.mock.calls[0]?.[0] as ReorderEvent;
    expect(event.to).toBe(0);
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

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);
    await nextFrame();

    list.dispatchEvent(
      new PointerEvent('pointercancel', {
        pointerId: 1,
        bubbles: true,
        composed: true,
      }),
    );

    await nextFrame();

    expect(internals(item).states.has('drag')).toBeFalsy();
  });

  // Asserted on the receiver rather than via `hasPointerCapture`, because
  // `user-event` dispatches untrusted pointer events and Chromium silently
  // no-ops `setPointerCapture` for those — real capture cannot be observed here.
  it('should take pointer capture on the host rather than the footprint', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    const targets: Element[] = [];
    const spy = vi
      .spyOn(Element.prototype, 'setPointerCapture')
      .mockImplementation(function spy(this: Element) {
        targets.push(this);
      });

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);
    spy.mockRestore();

    // Capture is taken on activation. The footprint is re-inserted every time it
    // moves, and leaving the document releases its capture, so only the host is a
    // safe capture target for the whole gesture.
    expect(targets).toStrictEqual([list]);
  });

  it('should tear the session down when the host disconnects mid-drag', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);
    await nextFrame();
    expect(list.querySelector('[data-footprint]')).not.toBeNull();

    list.remove();
    await nextFrame();

    expect(list.querySelector('[data-footprint]')).toBeNull();
    expect(internals(item).states.has('drag')).toBeFalsy();
  });

  // The session's pointermove listener lives outside the useEvents lifecycle,
  // so without an explicit teardown a disconnect would strand the session and
  // block every later drag.
  it('should allow a new drag after disconnecting mid-drag and reconnecting', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);
    await nextFrame();

    list.remove();
    await nextFrame();
    document.body.append(list);
    await nextFrame();

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);

    expect(internals(item).states.has('drag')).toBeTruthy();
  });

  it('should ignore pointerdown while a previous drag is settling', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
      { keys: '[/MouseLeft]' },
    ]);

    // The landing animation is still in flight here.
    await ue.pointer([{ target: item2, keys: '[MouseLeft>]' }]);

    expect(internals(item2).states.has('drag')).toBeFalsy();
  });

  it('should start a drag when the press lands on the item handle', async () => {
    const list = createList();
    const item = createHandleItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: grip(item), keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);

    expect(internals(item).states.has('drag')).toBeTruthy();
  });

  it('should not start a drag when the press misses the handle of an item that has one', async () => {
    const list = createList();
    const item = createHandleItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    // Press the item body, not its handle.
    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);

    expect(internals(item).states.has('drag')).toBeFalsy();
    expect(list.querySelector('[data-footprint]')).toBeNull();
  });

  it('should not start a drag on a non-primary press', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item, keys: '[MouseRight>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);

    expect(internals(item).states.has('drag')).toBeFalsy();
    expect(list.querySelector('[data-footprint]')).toBeNull();
  });

  it('should stop the landing and dispatch nothing when the host disconnects during settling', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await nextFrame();

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    // Activate, then release to start the (200ms) landing animation.
    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
    ]);
    await nextFrame();
    await ue.pointer([{ keys: '[/MouseLeft]' }]);

    // Disconnect while the landing is still animating.
    list.remove();
    await nextFrame();

    // Wait well past the animation duration: nothing should land or announce.
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    expect(reorderSpy).not.toHaveBeenCalled();
    expect(internals(item1).states.has('drag')).toBeFalsy();
    expect(list.querySelector('[data-footprint]')).toBeNull();
  });

  it('should clean up when the landing setup throws', async () => {
    const list = host((h) => {
      useShadowDOM(h, [createListTemplate()], []);
      useReorderable(h, () => {
        throw new Error('boom');
      });
    }, ReorderableCore);
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    const reportSpy = vi
      .spyOn(window, 'reportError')
      .mockImplementation(() => {});

    // Activate, then release: `timing()` throws while `land` builds the animation.
    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);
    await nextFrame();
    await ue.pointer([{ keys: '[/MouseLeft]' }]);
    await nextFrame();

    // The throw is reported, but the UI is fully restored rather than stuck.
    expect(reportSpy).toHaveBeenCalledOnce();
    expect(list.querySelector('[data-footprint]')).toBeNull();
    expect(internals(item).states.has('drag')).toBeFalsy();

    reportSpy.mockRestore();
  });

  it('should not finish the drag when a different pointer is released', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
    ]);
    await nextFrame();

    // A foreign pointer releasing over the host must not end someone else's drag.
    list.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: 424242, bubbles: true }),
    );
    await nextFrame();

    expect(internals(item1).states.has('drag')).toBeTruthy();
  });

  it('should restore pre-existing inline styles on the target after landing', async () => {
    const list = createList();
    const item = createItem();

    // The target already carries inline geometry the lift will overwrite.
    item.style.position = 'relative';
    item.style.transform = 'translateX(5px)';

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
      { keys: '[/MouseLeft]' },
    ]);
    await vi.waitFor(() => expect(reorderSpy).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    expect(item.style.position).toBe('relative');
    expect(item.style.transform).toBe('translateX(5px)');
  });

  it('should assign the footprint to the same named slot as the item', async () => {
    const template = document.createElement('template');
    template.innerHTML = '<slot name="items"></slot>';
    const list = host((h) => {
      useShadowDOM(h, [template], []);
      useReorderable(h, () => ({ duration: 200, easing: 'ease-out' }));
    }, ReorderableCore);
    const item = createItem();
    item.slot = 'items';

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);
    await nextFrame();

    const fp = list.querySelector<HTMLElement>('[data-footprint]')!;
    expect(fp.getAttribute('slot')).toBe('items');
  });

  it('should not dispatch ReorderEvent for a press that never crosses the threshold', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    // Press and release with no movement — a plain click, not a drop.
    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { keys: '[/MouseLeft]' },
    ]);
    await nextFrame();

    expect(reorderSpy).not.toHaveBeenCalled();
    expect(internals(item).states.has('drag')).toBeFalsy();
    expect(list.querySelector('[data-footprint]')).toBeNull();
  });
});
