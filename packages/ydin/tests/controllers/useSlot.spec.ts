import type { Constructor } from 'type-fest';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { useShadowDOM } from '../../src/controllers/useShadowDOM.ts';
import {
  useSlot,
  type SlotControllerUpdateCallback,
} from '../../src/controllers/useSlot.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, nextFrame, nameCE, matcher } from '../browser.ts';

describe('useSlot', () => {
  const template = document.createElement('template');
  template.innerHTML = '<slot></slot>';

  const namedTemplate = document.createElement('template');
  namedTemplate.innerHTML = '<slot name="label"></slot>';

  const dualTemplate = document.createElement('template');
  dualTemplate.innerHTML = '<slot></slot><slot name="label"></slot>';

  const slotMatcher = matcher('<slot></slot>');
  const namedSlotMatcher = matcher('<slot name="label"></slot>');

  function createDefaultHostWithSelectorMock(): readonly [
    mock: Mock<SlotControllerUpdateCallback<HTMLElement>>,
    ctr: Constructor<HTMLElement>,
  ] {
    const mock = vi.fn();

    return [
      mock,
      class Host extends ControlledElement {
        constructor() {
          super();
          useShadowDOM(this, [template], []);
          useSlot(this, 'slot', mock);
        }
      },
    ];
  }

  function createDefaultHostWithElementMock(): readonly [
    mock: Mock<SlotControllerUpdateCallback<HTMLElement>>,
    ctr: Constructor<HTMLElement>,
  ] {
    const mock = vi.fn();

    return [
      mock,
      class Host extends ControlledElement {
        constructor() {
          super();
          useShadowDOM(this, [template], []);
          useSlot(this, this.shadowRoot!.querySelector('slot')!, mock);
        }
      },
    ];
  }

  function createNamedHostWithMock(): readonly [
    mock: Mock<SlotControllerUpdateCallback<HTMLElement>>,
    ctr: Constructor<HTMLElement>,
  ] {
    const mock = vi.fn();

    return [
      mock,
      class Host extends ControlledElement {
        constructor() {
          super();
          useShadowDOM(this, [namedTemplate], []);
          useSlot(this, 'slot', mock);
        }
      },
    ];
  }

  function createDualHostWithMocks(): readonly [
    defaultMock: Mock<SlotControllerUpdateCallback<HTMLElement>>,
    namedMock: Mock<SlotControllerUpdateCallback<HTMLElement>>,
    ctr: Constructor<HTMLElement>,
  ] {
    const defaultMock = vi.fn();
    const namedMock = vi.fn();

    return [
      defaultMock,
      namedMock,
      class Host extends ControlledElement {
        constructor() {
          super();
          useShadowDOM(this, [dualTemplate], []);
          useSlot(this, 'slot:not([name])', defaultMock);
          useSlot(this, 'slot[name="label"]', namedMock);
        }
      },
    ];
  }

  it('should snapshot initially assigned elements after upgrade from HTML', async () => {
    const tag = nameCE();

    const [mock, ctr] = createDefaultHostWithSelectorMock();

    document.body.innerHTML = `<${tag}><span>initial</span></${tag}>`;

    defineCE(tag, ctr);

    // `slotchange` is fired asynchronously, so we have to wait before we
    // actually have the catch.
    await nextFrame();

    expect(mock).toHaveBeenCalledWith(slotMatcher, [
      matcher('<span>initial</span>'),
    ]);
  });

  it('should snapshot initially assigned elements when appended after definition', async () => {
    const tag = nameCE();
    const [mock, ctr] = createDefaultHostWithSelectorMock();

    defineCE(tag, ctr);

    const host = document.createElement(tag);

    const child = document.createElement('span');
    child.textContent = 'initial';
    host.append(child);

    document.body.append(host);

    await nextFrame();

    expect(mock).toHaveBeenCalledWith(slotMatcher, [
      matcher('<span>initial</span>'),
    ]);
  });

  it('should update assigned elements when slotted content is added', async () => {
    const tag = nameCE();
    const [mock, ctr] = createDefaultHostWithSelectorMock();

    defineCE(tag, ctr);

    let host = document.createElement(tag);

    document.body.append(host);

    await nextFrame();

    host = document.querySelector(tag)!;

    const child = document.createElement('span');

    child.textContent = 'added';
    host.append(child);

    await nextFrame();

    expect(mock).toHaveBeenLastCalledWith(slotMatcher, [
      matcher('<span>added</span>'),
    ]);
  });

  it('should update assigned elements when slotted content is removed', async () => {
    const tag = nameCE();
    const [mock, ctr] = createDefaultHostWithSelectorMock();

    defineCE(tag, ctr);

    const host = document.createElement(tag);
    const child = document.createElement('span');

    child.textContent = 'initial';
    host.append(child);
    document.body.append(host);

    await nextFrame();

    child.remove();

    await nextFrame();

    expect(mock).toHaveBeenLastCalledWith(slotMatcher, []);
  });

  it('should observe slot changes when HTMLSlotElement is passed directly', async () => {
    const tag = nameCE();
    const [mock, ctr] = createDefaultHostWithElementMock();

    defineCE(tag, ctr);

    const host = document.createElement(tag);
    const initial = document.createElement('span');

    initial.textContent = 'initial';
    host.append(initial);
    document.body.append(host);

    await nextFrame();

    expect(mock).toHaveBeenCalledWith(slotMatcher, [
      matcher('<span>initial</span>'),
    ]);

    const appended = document.createElement('span');

    appended.textContent = 'next';
    host.append(appended);

    await nextFrame();

    expect(mock).toHaveBeenLastCalledWith(slotMatcher, [
      matcher('<span>initial</span>'),
      matcher('<span>next</span>'),
    ]);
  });

  it('should update named slot when element with matching slot attribute is assigned', async () => {
    const tag = nameCE();
    const [mock, ctr] = createNamedHostWithMock();

    defineCE(tag, ctr);

    const host = document.createElement(tag);
    const child = document.createElement('span');

    child.slot = 'label';
    child.textContent = 'label';
    host.append(child);
    document.body.append(host);

    await nextFrame();

    expect(mock).toHaveBeenCalledWith(namedSlotMatcher, [
      matcher('<span slot="label">label</span>'),
    ]);
  });

  it('should move assigned element between default and named slots when slot attribute changes', async () => {
    const tag = nameCE();
    const [defaultMock, namedMock, ctr] = createDualHostWithMocks();

    defineCE(tag, ctr);

    const host = document.createElement(tag);
    const child = document.createElement('span');

    child.textContent = 'movable';
    host.append(child);
    document.body.append(host);

    await nextFrame();

    expect(defaultMock).toHaveBeenLastCalledWith(slotMatcher, [
      matcher('<span>movable</span>'),
    ]);

    child.slot = 'label';

    await nextFrame();

    expect(defaultMock).toHaveBeenLastCalledWith(slotMatcher, []);
    expect(namedMock).toHaveBeenLastCalledWith(namedSlotMatcher, [
      matcher('<span slot="label">movable</span>'),
    ]);
  });

  it('should isolate updates between multiple slots', async () => {
    const tag = nameCE();
    const [defaultMock, namedMock, ctr] = createDualHostWithMocks();

    defineCE(tag, ctr);

    const host = document.createElement(tag);
    const defaultChild = document.createElement('span');

    defaultChild.textContent = 'default';
    host.append(defaultChild);
    document.body.append(host);

    await nextFrame();

    expect(defaultMock).toHaveBeenCalledTimes(1);
    expect(namedMock).toHaveBeenCalledTimes(0);

    const namedChild = document.createElement('span');

    namedChild.slot = 'label';
    namedChild.textContent = 'label';
    host.append(namedChild);

    await nextFrame();

    expect(defaultMock).toHaveBeenCalledTimes(1);
    expect(namedMock).toHaveBeenCalledTimes(1);
    expect(namedMock).toHaveBeenLastCalledWith(namedSlotMatcher, [
      matcher('<span slot="label">label</span>'),
    ]);
  });

  it('should preserve assignedElements order after slotted children reorder', async () => {
    const tag = nameCE();
    const [mock, ctr] = createDefaultHostWithSelectorMock();

    defineCE(tag, ctr);

    const host = document.createElement(tag);
    const first = document.createElement('span');
    const second = document.createElement('span');

    first.textContent = 'first';
    second.textContent = 'second';
    host.append(first, second);
    document.body.append(host);

    await nextFrame();

    host.insertBefore(second, first);

    await nextFrame();

    expect(mock).toHaveBeenLastCalledWith(slotMatcher, [
      matcher('<span>second</span>'),
      matcher('<span>first</span>'),
    ]);
  });

  it('should ignore text nodes and only report assigned elements', async () => {
    const tag = nameCE();
    const [mock, ctr] = createDefaultHostWithSelectorMock();

    defineCE(tag, ctr);

    const host = document.createElement(tag);
    const child = document.createElement('span');

    child.textContent = 'element';
    host.append(document.createTextNode('text'), child);
    document.body.append(host);

    await nextFrame();

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenLastCalledWith(slotMatcher, [
      matcher('<span>element</span>'),
    ]);
  });

  it('should stop observing slot changes while host is disconnected', async () => {
    const tag = nameCE();
    const [mock, ctr] = createDefaultHostWithSelectorMock();

    defineCE(tag, ctr);

    const host = document.createElement(tag);
    const initial = document.createElement('span');

    initial.textContent = 'initial';
    host.append(initial);
    document.body.append(host);

    await nextFrame();

    expect(mock).toHaveBeenCalledTimes(1);

    host.remove();

    const detachedChild = document.createElement('span');

    detachedChild.textContent = 'detached';
    host.append(detachedChild);

    await nextFrame();

    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('should resume observing slot changes after host reconnect', async () => {
    const tag = nameCE();
    const [mock, ctr] = createDefaultHostWithSelectorMock();

    defineCE(tag, ctr);

    const host = document.createElement(tag);
    const initial = document.createElement('span');

    initial.textContent = 'initial';
    host.append(initial);
    document.body.append(host);

    await nextFrame();

    expect(mock).toHaveBeenCalledTimes(1);

    host.remove();

    const detachedChild = document.createElement('span');

    detachedChild.textContent = 'detached';
    host.append(detachedChild);

    await nextFrame();

    expect(mock).toHaveBeenCalledTimes(1);

    document.body.append(host);

    await nextFrame();

    const reconnectedChild = document.createElement('span');

    reconnectedChild.textContent = 'reconnected';
    host.append(reconnectedChild);

    await nextFrame();

    expect(mock).toHaveBeenLastCalledWith(slotMatcher, [
      matcher('<span>initial</span>'),
      matcher('<span>detached</span>'),
      matcher('<span>reconnected</span>'),
    ]);
  });

  it('should not call callback for an initially empty slot before first slotchange', async () => {
    const tag = nameCE();
    const [mock, ctr] = createDefaultHostWithSelectorMock();

    defineCE(tag, ctr);

    document.body.append(document.createElement(tag));

    await nextFrame();

    expect(mock).not.toHaveBeenCalled();
  });
});
