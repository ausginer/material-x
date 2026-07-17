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

/** Dispatches a bubbling, composed `keydown` so the host handler sees it. */
function pressKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
}

/**
 * Simulates a controlled consumer: on the reorder intent, move the item node to
 * the proposed index (via `insertBefore`, the way a framework reorder would, so
 * the lifted popover stays connected).
 */
function commitOnReorder(list: HTMLElement): void {
  list.addEventListener('reorder', (event) => {
    const e = event as ReorderEvent;
    const others = [...list.children].filter(
      (c): c is ControlledElement =>
        c instanceof ControlledElement && c !== e.item,
    );
    list.insertBefore(e.item, others[e.to] ?? null);
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

  it('should be cancelable, being a proposed move rather than a commit', () => {
    expect(createReorderEvent().cancelable).toBeTruthy();
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

    // Real, stacked heights so the item centres are distinguishable.
    list.style.display = 'block';
    for (const item of [item1, item2]) {
      item.style.display = 'block';
      item.style.height = '50px';
    }

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

  it('should reorder a horizontal row', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();
    const item3 = createItem();

    // Lay the items out in a row.
    list.style.display = 'flex';
    for (const item of [item1, item2, item3]) {
      item.style.display = 'block';
      item.style.width = '60px';
      item.style.height = '24px';
    }

    document.body.append(list);
    list.append(item1, item2, item3);
    list.reorderable = true;
    await nextFrame();

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    // Drag item1 far to the right, past both siblings, and release.
    await ue.pointer([
      {
        target: item1,
        keys: '[MouseLeft>]',
        coords: { clientX: 10, clientY: 10 },
      },
      { coords: { clientX: 9999, clientY: 10 } },
    ]);
    await nextFrame();

    // The footprint should have tracked the pointer to the end of the row.
    expect(list.lastElementChild).toBe(list.querySelector('[data-footprint]'));

    await ue.pointer([{ keys: '[/MouseLeft]' }]);
    await vi.waitFor(() => expect(reorderSpy).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    const event = reorderSpy.mock.calls[0]?.[0] as ReorderEvent;
    expect(event.from).toBe(0);
    expect(event.to).toBe(2);
  });

  it('should reorder within a 2D grid by nearest cell', async () => {
    const list = createList();
    const items = [createItem(), createItem(), createItem(), createItem()];

    // A 2x2 grid: item1 top-left, item2 top-right, item3/4 on the row below.
    list.style.display = 'grid';
    list.style.gridTemplateColumns = '50px 50px';
    for (const item of items) {
      item.style.display = 'block';
      item.style.width = '50px';
      item.style.height = '50px';
    }

    document.body.append(list);
    list.append(...items);
    list.reorderable = true;
    await nextFrame();

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    // Drag item1 onto the far (bottom-right) cell that item4 occupies.
    const from = items[0]!.getBoundingClientRect();
    const target = items[3]!.getBoundingClientRect();
    await ue.pointer([
      {
        target: items[0],
        keys: '[MouseLeft>]',
        coords: { clientX: from.left + 25, clientY: from.top + 25 },
      },
      { coords: { clientX: target.left + 25, clientY: target.top + 25 } },
    ]);
    await nextFrame();
    await ue.pointer([{ keys: '[/MouseLeft]' }]);

    await vi.waitFor(() => expect(reorderSpy).toHaveBeenCalledOnce(), {
      timeout: 1000,
    });

    const event = reorderSpy.mock.calls[0]?.[0] as ReorderEvent;
    expect(event.from).toBe(0);
    expect(event.to).toBe(3);
  });

  it('should dispatch ReorderEvent with correct indices on pointerup', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();
    const item3 = createItem();

    // Real, stacked heights so the item centres are distinguishable.
    list.style.display = 'block';
    for (const item of [item1, item2, item3]) {
      item.style.display = 'block';
      item.style.height = '50px';
    }

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

  it('should propose a move without reordering the DOM itself', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();
    const item3 = createItem();

    list.style.display = 'block';
    for (const item of [item1, item2, item3]) {
      item.style.display = 'block';
      item.style.height = '50px';
    }

    document.body.append(list);
    list.append(item1, item2, item3);
    list.reorderable = true;
    await nextFrame();

    // Capture the item order at the moment the intent fires — the trait must not
    // have moved anything itself; that is the consumer's job.
    let orderAtIntent: readonly ControlledElement[] | null = null;
    list.addEventListener('reorder', () => {
      orderAtIntent = [...list.children].filter(
        (c): c is ControlledElement => c instanceof ControlledElement,
      );
    });

    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
      { keys: '[/MouseLeft]' },
    ]);

    await vi.waitFor(() => expect(orderAtIntent).not.toBeNull(), {
      timeout: 1000,
    });

    expect(orderAtIntent).toStrictEqual([item1, item2, item3]);
  });

  it('should not dispatch a reorder for a no-op drop', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    // Sole item: it can only land where it started, so nothing is proposed.
    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
      { keys: '[/MouseLeft]' },
    ]);
    await vi.waitFor(() => expect(item.matches(':popover-open')).toBeFalsy(), {
      timeout: 1000,
    });

    expect(reorderSpy).not.toHaveBeenCalled();
  });

  it('should animate home and not move when the intent is prevented', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();
    const item3 = createItem();

    list.style.display = 'block';
    for (const item of [item1, item2, item3]) {
      item.style.display = 'block';
      item.style.height = '50px';
    }

    document.body.append(list);
    list.append(item1, item2, item3);
    list.reorderable = true;
    await nextFrame();

    const reorderSpy = vi.fn<(e: Event) => void>((e) => e.preventDefault());
    list.addEventListener('reorder', reorderSpy);

    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
      { keys: '[/MouseLeft]' },
    ]);

    await vi.waitFor(
      () => expect(internals(item1).states.has('drag')).toBeFalsy(),
      { timeout: 1000 },
    );

    // The intent was dispatched, but rejecting it leaves the order untouched.
    expect(reorderSpy).toHaveBeenCalledOnce();
    expect(
      [...list.children].filter((c) => c instanceof ControlledElement),
    ).toStrictEqual([item1, item2, item3]);
  });

  it('should settle once the consumer commits the proposed move', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();
    const item3 = createItem();

    list.style.display = 'block';
    for (const item of [item1, item2, item3]) {
      item.style.display = 'block';
      item.style.height = '50px';
    }

    document.body.append(list);
    list.append(item1, item2, item3);
    list.reorderable = true;
    commitOnReorder(list);
    await nextFrame();

    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
      { keys: '[/MouseLeft]' },
    ]);

    // The consumer moved item1 to the end; the session settles on that commit.
    await vi.waitFor(() => expect(item1.matches(':popover-open')).toBeFalsy(), {
      timeout: 1000,
    });

    expect(
      [...list.children].filter((c) => c instanceof ControlledElement),
    ).toStrictEqual([item2, item3, item1]);
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

    // Drag to the bottom (footprint moves after item2), then return near the
    // origin. The threshold only gates the first activation, so the footprint
    // must follow back to the front rather than freeze at the bottom.
    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 9999 } },
    ]);
    await nextFrame();
    expect(list.lastElementChild).toBe(list.querySelector('[data-footprint]'));

    await ue.pointer([{ coords: { clientY: 10 } }]);
    await nextFrame();

    // Footprint has tracked back to sit before item2 again.
    expect(list.querySelector('[data-footprint]')!.nextElementSibling).toBe(
      item2,
    );
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

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
      { keys: '[/MouseLeft]' },
    ]);

    // Sole item, so the drop is a no-op that just animates home; wait for the
    // teardown to restore the target's own inline styles.
    await vi.waitFor(() => expect(item.style.position).toBe('relative'), {
      timeout: 1000,
    });
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

  it('should lift the dragged visual into the top layer as a popover', async () => {
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

    // The visual target defaults to the item itself in these tests.
    expect(item.matches(':popover-open')).toBeTruthy();
  });

  it('should take the visual out of the top layer once the drag lands', async () => {
    const list = createList();
    const item = createItem();

    document.body.append(list);
    list.append(item);
    list.reorderable = true;
    await nextFrame();

    await ue.pointer([
      { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
      { keys: '[/MouseLeft]' },
    ]);

    // Wait for the landing to settle and hand the visual back from the top layer.
    await vi.waitFor(() => expect(item.matches(':popover-open')).toBeFalsy(), {
      timeout: 1000,
    });
    expect(item.hasAttribute('popover')).toBeFalsy();
  });

  it('should remeasure item geometry after a scroll', async () => {
    const list = createList();
    const item1 = createItem();
    const item2 = createItem();

    document.body.append(list);
    list.append(item1, item2);
    list.reorderable = true;
    await nextFrame();

    // Activate a drag on item1.
    await ue.pointer([
      { target: item1, keys: '[MouseLeft>]', coords: { clientY: 10 } },
      { coords: { clientY: 100 } },
    ]);
    await nextFrame();

    // Only count measurements taken after activation has settled.
    const rectSpy = vi.spyOn(item2, 'getBoundingClientRect');

    // A scroll invalidates the cached rects; the next hit test must remeasure
    // rather than trust stale viewport coordinates.
    window.dispatchEvent(new Event('scroll'));
    await nextFrame();
    await nextFrame();

    expect(rectSpy).toHaveBeenCalled();
    rectSpy.mockRestore();
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

describe('useReorderable keyboard', () => {
  async function mountKeyboardList(count: number) {
    const list = createList();
    const items = Array.from({ length: count }, () => createHandleItem());

    document.body.append(list);
    list.append(...items);
    list.reorderable = true;
    await nextFrame();

    return { list, items };
  }

  it('should grab the item when space is pressed on its handle', async () => {
    const { list, items } = await mountKeyboardList(2);

    pressKey(grip(items[0]!), ' ');

    expect(internals(items[0]!).states.has('drag')).toBeTruthy();
    expect(list.querySelector('[data-footprint]')).not.toBeNull();
  });

  it('should not grab when the key lands off the handle', async () => {
    const { list, items } = await mountKeyboardList(2);

    // The item body, not its handle, gets the key.
    pressKey(items[0]!, ' ');

    expect(internals(items[0]!).states.has('drag')).toBeFalsy();
    expect(list.querySelector('[data-footprint]')).toBeNull();
  });

  it('should step the footprint forward on ArrowDown', async () => {
    const { list, items } = await mountKeyboardList(3);

    pressKey(grip(items[0]!), ' ');
    pressKey(grip(items[0]!), 'ArrowDown');

    // Footprint moved from before item1 to after item2.
    const fp = list.querySelector<HTMLElement>('[data-footprint]')!;
    expect(fp.previousElementSibling).toBe(items[1]);
  });

  it('should dispatch ReorderEvent with the stepped indices on drop', async () => {
    const { list, items } = await mountKeyboardList(3);

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    pressKey(grip(items[0]!), ' ');
    pressKey(grip(items[0]!), 'ArrowDown');
    pressKey(grip(items[0]!), 'ArrowDown');
    pressKey(grip(items[0]!), ' ');

    expect(reorderSpy).toHaveBeenCalledOnce();
    const event = reorderSpy.mock.calls[0]?.[0] as ReorderEvent;
    expect(event.from).toBe(0);
    expect(event.to).toBe(2);
  });

  it('should not dispatch a reorder when the grab is cancelled with Escape', async () => {
    const { list, items } = await mountKeyboardList(3);

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    pressKey(grip(items[0]!), ' ');
    pressKey(grip(items[0]!), 'ArrowDown');
    pressKey(grip(items[0]!), 'Escape');

    expect(reorderSpy).not.toHaveBeenCalled();
    expect(internals(items[0]!).states.has('drag')).toBeFalsy();
    expect(list.querySelector('[data-footprint]')).toBeNull();
  });

  it('should not dispatch a reorder for a keyboard drop that never moved', async () => {
    const { list, items } = await mountKeyboardList(3);

    const reorderSpy = vi.fn<(e: Event) => void>();
    list.addEventListener('reorder', reorderSpy);

    pressKey(grip(items[0]!), ' ');
    // Drop immediately, without any arrow move.
    pressKey(grip(items[0]!), ' ');

    expect(reorderSpy).not.toHaveBeenCalled();
    await vi.waitFor(
      () => expect(internals(items[0]!).states.has('drag')).toBeFalsy(),
      { timeout: 1000 },
    );
  });

  it('should announce the grab through a shadow-owned live region', async () => {
    const { list, items } = await mountKeyboardList(2);

    pressKey(grip(items[0]!), ' ');

    const live = list.shadowRoot!.querySelector('[aria-live]');
    expect(live?.textContent).toContain('Grabbed');
  });
});
