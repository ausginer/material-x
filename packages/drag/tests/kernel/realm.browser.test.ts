import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { FreeDropResolution } from '../../src/draggable/options.ts';
import {
  draggable,
  type DraggableOptions,
  type FreeDragController,
} from '../../src/draggable.ts';
import { createRealm } from '../../src/kernel/realm.ts';

const live: FreeDragController[] = [];
const frames: HTMLIFrameElement[] = [];

/**
 * An attached same-origin iframe with its own document, so every realm-sensitive
 * read (constructors, listeners, scroll, `instanceof`) has a second realm that
 * would produce a different answer if the package reached for ambient globals.
 */
function createFrame(): Document {
  const frame = document.createElement('iframe');
  frame.style.width = '400px';
  frame.style.height = '300px';
  frame.style.border = '0';
  document.body.append(frame);
  frames.push(frame);

  const doc = frame.contentDocument;

  if (!doc) {
    throw new Error('iframe has no contentDocument');
  }

  doc.body.style.margin = '0';
  return doc;
}

function createBoxIn(doc: Document): HTMLElement {
  const el = doc.createElement('div');
  Object.assign(el.style, {
    position: 'absolute',
    left: '40px',
    top: '60px',
    width: '80px',
    height: '50px',
  });
  doc.body.append(el);
  return el;
}

/** Dispatches a pointer event into the element's own realm. */
function pointer(
  target: EventTarget,
  doc: Document,
  type: string,
  x: number,
  y: number,
  buttons = 1,
): void {
  const view = doc.defaultView;

  if (!view) {
    throw new Error('document has no view');
  }

  target.dispatchEvent(
    new view.PointerEvent(type, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      buttons,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
  );
}

describe('createRealm', () => {
  afterEach(() => {
    for (const controller of live.splice(0)) {
      controller.destroy();
    }
    for (const frame of frames.splice(0)) {
      frame.remove();
    }
    document.body.replaceChildren();
  });

  it('should derive the realm from the element owning document', () => {
    const doc = createFrame();
    const realm = createRealm(createBoxIn(doc));

    expect(realm.document).toBe(doc);
    expect(realm.window).toBe(doc.defaultView);
  });

  it('should not fall back to the ambient window for a foreign element', () => {
    const doc = createFrame();
    const realm = createRealm(createBoxIn(doc));

    expect(realm.window).not.toBe(window);
    expect(realm.document).not.toBe(document);
  });

  it('should throw for an element whose document has no view', () => {
    const detached = new DOMParser().parseFromString(
      '<div></div>',
      'text/html',
    );
    const el = detached.querySelector('div');

    // Falling back to the ambient window here would silently mix realms.
    expect(() => createRealm(el as Element)).toThrow(/owning window/);
  });

  it('should recognise an element from another realm structurally', () => {
    const doc = createFrame();
    const foreign = createBoxIn(doc);
    const realm = createRealm(document.body);

    // This is precisely why the check is structural: a foreign element fails
    // `instanceof` against the host realm's constructor.
    expect(foreign instanceof HTMLElement).toBeFalsy();
    expect(realm.isElement(foreign)).toBeTruthy();
  });

  it('should reject non-element values', () => {
    const realm = createRealm(document.body);

    expect(realm.isElement(null)).toBeFalsy();
    expect(realm.isElement('div')).toBeFalsy();
    expect(realm.isElement(document)).toBeFalsy();
  });
});

describe('draggable inside an iframe realm', () => {
  afterEach(() => {
    for (const controller of live.splice(0)) {
      controller.destroy();
    }
    for (const frame of frames.splice(0)) {
      frame.remove();
    }
    document.body.replaceChildren();
  });

  it('should run a whole gesture against the owning realm', async () => {
    const doc = createFrame();
    const item = createBoxIn(doc);
    const onStart: Mock<NonNullable<DraggableOptions['onStart']>> = vi.fn();
    const onFinish: Mock<NonNullable<DraggableOptions['onFinish']>> = vi.fn();
    const controller = draggable(item, {
      onDrop: () => FreeDropResolution.accept(),
      onStart,
      onFinish,
    });
    live.push(controller);

    // Session listeners are armed on the iframe's document, so a gesture only
    // completes if every stage used that realm rather than the host one.
    pointer(item, doc, 'pointerdown', 50, 70);
    pointer(doc, doc, 'pointermove', 90, 110);
    expect(onStart).toHaveBeenCalledOnce();

    pointer(doc, doc, 'pointerup', 90, 110, 0);
    await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce());

    expect(item.matches(':popover-open')).toBeFalsy();
  });

  it('should build the drop request rect with the owning realm constructor', async () => {
    const doc = createFrame();
    const view = doc.defaultView;
    const item = createBoxIn(doc);
    let visualRect: unknown;
    const controller = draggable(item, {
      onDrop(request) {
        ({ visualRect } = request);
        return FreeDropResolution.accept();
      },
    });
    live.push(controller);

    pointer(item, doc, 'pointerdown', 50, 70);
    pointer(doc, doc, 'pointermove', 90, 110);
    pointer(doc, doc, 'pointerup', 90, 110, 0);
    await vi.waitFor(() => expect(visualRect).toBeDefined());

    // The consumer receives a rect from its own realm, so its `instanceof`
    // checks and prototype expectations hold.
    expect(visualRect).toBeInstanceOf(view!.DOMRectReadOnly);
  });

  it('should lift the item into the iframe top layer', () => {
    const doc = createFrame();
    const item = createBoxIn(doc);
    const controller = draggable(item, {
      onDrop: () => FreeDropResolution.accept(),
    });
    live.push(controller);

    pointer(item, doc, 'pointerdown', 50, 70);
    pointer(doc, doc, 'pointermove', 90, 110);

    expect(item.matches(':popover-open')).toBeTruthy();
    expect(item.ownerDocument).toBe(doc);
  });

  it('should track movement in the iframe coordinate space', () => {
    const doc = createFrame();
    const item = createBoxIn(doc);
    const before = item.getBoundingClientRect();
    const controller = draggable(item, {
      onDrop: () => FreeDropResolution.accept(),
    });
    live.push(controller);

    pointer(item, doc, 'pointerdown', 50, 70);
    pointer(doc, doc, 'pointermove', 90, 110);
    pointer(doc, doc, 'pointermove', 115, 145);
    const after = item.getBoundingClientRect();

    // Client coordinates are relative to the iframe viewport, so the visual
    // follows the pointer offset from the press point. Measuring against the
    // host viewport instead would displace it by the frame's own position.
    expect(after.left - before.left).toBeCloseTo(115 - 50, 0);
    expect(after.top - before.top).toBeCloseTo(145 - 70, 0);
  });

  it('should ignore host-document input for an iframe-owned gesture', () => {
    const doc = createFrame();
    const item = createBoxIn(doc);
    const onStart: Mock<NonNullable<DraggableOptions['onStart']>> = vi.fn();
    const controller = draggable(item, {
      onDrop: () => FreeDropResolution.accept(),
      onStart,
    });
    live.push(controller);

    pointer(item, doc, 'pointerdown', 50, 70);
    // A move in the host realm belongs to a different document entirely.
    pointer(document, document, 'pointermove', 400, 400);

    expect(onStart).not.toHaveBeenCalled();
  });
});
