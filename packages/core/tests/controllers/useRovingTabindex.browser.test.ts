import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useRovingTabindex } from '../../src/controllers/useRovingTabindex.ts';
import { ControlledElement } from '../../src/element.ts';
import type { Checkable } from '../../src/traits/checkable.ts';
import { compose, type Composed } from '../../src/traits/composition.ts';
import type { Disableable } from '../../src/traits/disableable.ts';
import type { Valuable } from '../../src/traits/valuable.ts';
import { cleanupDOM, defineCE, host, nameCE, nextFrame } from '../browser.ts';

const HostComposition: Composed<typeof ControlledElement, [typeof Valuable]> =
  compose(ControlledElement);

class HostBase extends HostComposition {}

const ItemComposition: Composed<
  typeof ControlledElement,
  [typeof Checkable, typeof Valuable, typeof Disableable]
> = compose(ControlledElement);

class ItemBase extends ItemComposition {}

class TestItem extends ItemBase {
  constructor() {
    super();
    this.tabIndex = -1;
  }
}

class ShadowItem extends ItemBase {
  readonly target: HTMLButtonElement;

  constructor() {
    super();
    this.tabIndex = -1;

    const root = this.attachShadow({ mode: 'open' });
    const target = document.createElement('button');

    target.type = 'button';
    root.append(target);

    this.target = target;
  }
}

afterEach(() => {
  cleanupDOM();
});

let isTestItemDefined = false;
let isShadowItemDefined = false;

function createHost(options?: {
  readonly dir?: 'ltr' | 'rtl';
  readonly slotName?: string;
  readonly slotSelector?: string;
}): InstanceType<typeof HostBase> & { slotElement: HTMLSlotElement } {
  let slotElement!: HTMLSlotElement;

  const el = host((h) => {
    const root = h.attachShadow({ mode: 'open' });

    slotElement = document.createElement('slot');

    if (options?.slotName) {
      slotElement.name = options.slotName;
    }

    root.append(slotElement);

    if (options?.dir) {
      h.dir = options.dir;
    }

    useRovingTabindex(h, options?.slotSelector);
  }, HostBase);

  return Object.assign(el, { slotElement });
}

function createItem(options?: {
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly slot?: string;
  readonly value?: string | null;
}): TestItem {
  if (!isTestItemDefined) {
    defineCE(nameCE(), TestItem);
    isTestItemDefined = true;
  }

  const item = new TestItem();

  if (options?.slot) {
    item.slot = options.slot;
  }

  if (options?.value !== undefined) {
    item.value = options.value;
  }

  if (options?.checked !== undefined) {
    item.checked = options.checked;
  }

  if (options?.disabled !== undefined) {
    item.disabled = options.disabled;
  }

  return item;
}

function createShadowItem(options?: {
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly slot?: string;
  readonly value?: string | null;
}): ShadowItem {
  if (!isShadowItemDefined) {
    defineCE(nameCE(), ShadowItem);
    isShadowItemDefined = true;
  }

  const item = new ShadowItem();

  if (options?.slot) {
    item.slot = options.slot;
  }

  if (options?.value !== undefined) {
    item.value = options.value;
  }

  if (options?.checked !== undefined) {
    item.checked = options.checked;
  }

  if (options?.disabled !== undefined) {
    item.disabled = options.disabled;
  }

  return item;
}

function createInertElement(slot?: string): HTMLDivElement {
  const element = document.createElement('div');

  element.tabIndex = -1;

  if (slot) {
    element.slot = slot;
  }

  return element;
}

async function mountHost(
  host: HTMLElement,
  ...children: HTMLElement[]
): Promise<void> {
  host.append(...children);
  document.body.append(host);
  await nextFrame();
}

function expectTabStop(
  items: readonly HTMLElement[],
  target?: HTMLElement,
): void {
  for (const item of items) {
    expect(item.tabIndex).toBe(item === target ? 0 : -1);
  }
}

function watchSelection(target: HTMLElement) {
  const input: Mock<EventListener> = vi.fn();
  const change: Mock<EventListener> = vi.fn();

  target.addEventListener('input', input);
  target.addEventListener('change', change);

  return { change, input };
}

function watchDefaultPrevented(
  target: Pick<Document, 'addEventListener'> | HTMLElement,
): boolean[] {
  const states: boolean[] = [];

  target.addEventListener('keydown', (event) => {
    states.push(event.defaultPrevented);
  });

  return states;
}

async function press(
  host: HTMLElement,
  text: string,
): Promise<boolean | undefined> {
  const user = userEvent.setup();
  const prevented = watchDefaultPrevented(host);

  await user.keyboard(text);

  return prevented.at(-1);
}

describe('useRovingTabindex', () => {
  describe('slot and tab stop management', () => {
    it('should ignore slotted elements that do not implement the required traits', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const invalid = createInertElement();

      await mountHost(host, first, invalid);

      expectTabStop([first], first);
      expect(invalid.tabIndex).toBe(-1);
    });

    it('should set the tab stop to the enabled item matching host value', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });

      host.value = 'second';

      await mountHost(host, first, second);

      expectTabStop([first, second], second);
    });

    it('should fall back to the active item when host value does not match any enabled item', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });

      await mountHost(host, first, second);

      second.focus();
      host.value = 'missing';

      expectTabStop([first, second], second);
    });

    it('should fall back to the first enabled item when neither value nor active item is usable', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      second.focus();
      second.disabled = true;
      host.value = 'missing';

      expectTabStop([first, second, third], first);
    });

    it('should clear the tab stop when no enabled items are available', async () => {
      const host = createHost();
      const first = createItem({ disabled: true, value: 'first' });
      const second = createItem({ disabled: true, value: 'second' });

      await mountHost(host, first, second);

      expectTabStop([first, second]);
    });

    it('should recompute the tab stop when slot contents change', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });

      host.value = 'second';

      await mountHost(host, first);

      expectTabStop([first], first);

      const second = createItem({ value: 'second' });

      host.append(second);
      await nextFrame();

      expectTabStop([first, second], second);
    });

    it('should give the tab stop to an item put first when focus chose none', async () => {
      const host = createHost();
      const item = createItem({ value: 'item' });
      const added = createItem({ value: 'added' });

      await mountHost(host, item);
      host.prepend(added);
      await nextFrame();

      expectTabStop([added, item], added);
    });

    it('should keep the tab stop that focus chose when an item is put first', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const added = createItem({ value: 'added' });

      await mountHost(host, first, second);
      second.focus();
      second.blur();
      host.prepend(added);
      await nextFrame();

      expectTabStop([added, first, second], second);
    });

    it('should keep the tab stop that the last focus chose when an item is put first', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });
      const added = createItem({ value: 'added' });

      await mountHost(host, first, second, third);
      second.focus();
      third.focus();
      third.blur();
      host.prepend(added);
      await nextFrame();

      expectTabStop([added, first, second, third], third);
    });

    it('should move the tab stop to the first item when the host value stops matching and focus chose none', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });

      host.value = 'second';
      await mountHost(host, first, second);
      host.value = 'missing';

      expectTabStop([first, second], first);
    });

    it('should move the tab stop to the item that focus chose when the host value stops matching', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);
      second.focus();
      second.blur();
      host.value = 'third';
      host.value = 'missing';

      expectTabStop([first, second, third], second);
    });

    it('should forget the item that focus chose when it leaves the slot', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });

      await mountHost(host, first, second);
      second.focus();
      second.remove();
      await nextFrame();
      host.append(second);
      await nextFrame();

      expectTabStop([first, second], first);
    });

    describe('with an item focused in the task that adds it', () => {
      async function mountFocused() {
        const host = createHost();
        const first = createItem({ value: 'first' });
        const second = createItem({ value: 'second' });

        await mountHost(host, first);
        host.append(second);
        second.focus();
        await nextFrame();

        return { host, first, second };
      }

      it('should give the tab stop to it', async () => {
        const { first, second } = await mountFocused();

        expectTabStop([first, second], second);
      });

      it('should keep the tab stop on it after it is blurred', async () => {
        const { host, first, second } = await mountFocused();
        const added = createItem({ value: 'added' });

        second.blur();
        host.prepend(added);
        await nextFrame();

        expectTabStop([added, first, second], second);
      });

      it('should give the tab stop to it when focus chose another earlier', async () => {
        const host = createHost();
        const first = createItem({ value: 'first' });
        const second = createItem({ value: 'second' });
        const third = createItem({ value: 'third' });

        await mountHost(host, first, second);
        second.focus();
        host.append(third);
        third.focus();
        await nextFrame();

        expectTabStop([first, second, third], third);
      });

      it('should keep the tab stop that focus chose earlier when the added item is disabled', async () => {
        const host = createHost();
        const first = createItem({ value: 'first' });
        const second = createItem({ value: 'second' });
        const third = createItem({ disabled: true, value: 'third' });

        await mountHost(host, first, second);
        second.focus();
        host.append(third);
        third.focus();
        await nextFrame();

        expect(document.activeElement).toBe(third);
        expectTabStop([first, second, third], second);
      });
    });

    it('should observe a custom slot selector when provided', async () => {
      const host = createHost({
        slotName: 'items',
        slotSelector: 'slot[name="items"]',
      });
      const first = createItem({ slot: 'items', value: 'first' });
      const second = createItem({ slot: 'items', value: 'second' });
      const ignored = createItem({ value: 'ignored' });

      await mountHost(host, first, second, ignored);

      expectTabStop([first, second], first);
      expect(ignored.tabIndex).toBe(-1);
    });
  });

  describe('focus synchronization', () => {
    it('should update the tab stop when an enabled item receives focus', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });

      await mountHost(host, first, second);

      second.focus();

      expectTabStop([first, second], second);
    });

    it('should update the tab stop when focus enters a composed descendant of an item', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createShadowItem({ value: 'second' });

      await mountHost(host, first, second);

      second.target.focus();

      expectTabStop([first, second], second);
    });

    it('should ignore focus entering a disabled item', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ disabled: true, value: 'second' });

      await mountHost(host, first, second);

      second.focus();

      expectTabStop([first, second], first);
    });

    it('should ignore focus events from elements outside the managed item set', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const external = createInertElement();

      external.tabIndex = 0;

      await mountHost(host, first, external);

      external.focus();

      expectTabStop([first], first);
    });
  });

  describe('items upgraded after the slot change', () => {
    class LateItem extends ItemBase {
      constructor() {
        super();
        this.tabIndex = -1;
      }
    }

    /** Elements of `tag` cloned from a template, so not upgraded. */
    function cloneItems(tag: string, ...values: readonly string[]) {
      const template = document.createElement('template');
      template.innerHTML = values
        .map((value) => `<${tag} value="${value}"></${tag}>`)
        .join('');
      const fragment = template.content.cloneNode(true);

      return Array.from(fragment.childNodes).filter(
        (node) => node instanceof HTMLElement,
      );
    }

    /** A tag whose definition creates items. */
    function defineItemTag(): string {
      const tag = nameCE();
      defineCE(tag, class extends LateItem {});

      return tag;
    }

    const WAYS = [
      { way: 'before the first connect', isConnectedFirst: false },
      { way: 'while the host is out', isConnectedFirst: true },
    ] as const;

    describe.each(WAYS)('cloned $way', ({ isConnectedFirst }) => {
      /** A host that isn't in the document, and gets `children` there. */
      async function connectWith(...children: readonly HTMLElement[]) {
        const host = createHost();

        if (isConnectedFirst) {
          document.body.append(host);
          await nextFrame();
          host.remove();
          await nextFrame();
        }

        host.append(...children);
        await nextFrame();
        document.body.append(host);
        await nextFrame();
      }

      it('should manage every clone', async () => {
        const clones = cloneItems(defineItemTag(), 'a', 'b', 'c');

        await connectWith(...clones);

        expect(clones.map((item) => item.tabIndex)).toEqual([0, -1, -1]);
      });

      it('should move between the clones with an arrow key', async () => {
        const clones = cloneItems(defineItemTag(), 'a', 'b', 'c');

        await connectWith(...clones);
        clones[0]!.focus();
        await userEvent.setup().keyboard('{ArrowRight}');

        expect(document.activeElement).toBe(clones[1]);
      });

      it('should manage a clone after a created item', async () => {
        const [clone] = cloneItems(defineItemTag(), 'clone');
        const first = createItem({ value: 'first' });

        await connectWith(first, clone!);
        first.focus();
        await userEvent.setup().keyboard('{ArrowRight}');

        expect(document.activeElement).toBe(clone);
      });

      it('should give the tab stop to a clone before a created item', async () => {
        const [clone] = cloneItems(defineItemTag(), 'clone');
        const last = createItem({ value: 'last' });

        await connectWith(clone!, last);

        expectTabStop([clone!, last], clone);
      });
    });

    it('should manage items defined after the host is connected', async () => {
      const tag = nameCE();
      const host = createHost();
      const late = cloneItems(tag, 'a', 'b');

      await mountHost(host, ...late);
      defineCE(tag, class extends LateItem {});
      await nextFrame();

      expect(late.map((item) => item.getAttribute('tabindex'))).toEqual([
        '0',
        '-1',
      ]);
    });

    it('should move between items defined after the host is connected', async () => {
      const tag = nameCE();
      const host = createHost();
      const late = cloneItems(tag, 'a', 'b');

      await mountHost(host, ...late);
      defineCE(tag, class extends LateItem {});
      await nextFrame();
      late[0]!.focus();
      await userEvent.setup().keyboard('{ArrowRight}');

      expect(document.activeElement).toBe(late[1]);
    });

    describe('next to a created item', () => {
      /** The created item is second, and the late one is defined by `define`. */
      async function mountMixed() {
        const tag = nameCE();
        const host = createHost();
        const [late] = cloneItems(tag, 'late');
        const item = createItem({ value: 'item' });

        await mountHost(host, late!, item);

        return {
          host,
          late: late!,
          item,
          define: async () => {
            defineCE(tag, class extends LateItem {});
            await nextFrame();
          },
        };
      }

      it('should give the tab stop to the late item when it is first', async () => {
        const { late, item, define } = await mountMixed();

        await define();

        expectTabStop([late, item], late);
      });

      it('should give the tab stop to the late item when it is first and another item was added', async () => {
        const { host, late, item, define } = await mountMixed();
        const added = createItem({ value: 'added' });

        host.append(added);
        await nextFrame();
        await define();

        expectTabStop([late, item, added], late);
      });

      it('should give the tab stop to the late item that matches the host value', async () => {
        const { host, late, item, define } = await mountMixed();

        host.value = 'late';
        await define();

        expectTabStop([late, item], late);
      });

      it('should keep the tab stop that the host value chose', async () => {
        const { host, late, item, define } = await mountMixed();

        host.value = 'item';
        await define();

        expectTabStop([late, item], item);
      });

      it('should keep the tab stop that focus chose', async () => {
        const { late, item, define } = await mountMixed();

        item.focus();
        item.blur();
        await define();

        expectTabStop([late, item], item);
      });

      it('should keep the tab stop that focus chose when the host value matches no item', async () => {
        const { host, late, item, define } = await mountMixed();

        item.focus();
        item.blur();
        host.value = 'missing';
        await define();

        expectTabStop([late, item], item);
      });

      it('should give the tab stop back to the item of the host value when focus moved it away', async () => {
        const { host, late, item, define } = await mountMixed();
        const matching = createItem({ value: 'matching' });

        host.append(matching);
        host.value = 'matching';
        await nextFrame();
        item.focus();
        await define();

        expectTabStop([late, item, matching], matching);
      });

      it('should give the tab stop to the late item when an item was there before it', async () => {
        const tag = nameCE();
        const host = createHost();
        const [late] = cloneItems(tag, 'late');
        const item = createItem({ value: 'item' });

        await mountHost(host, item);
        host.prepend(late!);
        await nextFrame();
        defineCE(tag, class extends LateItem {});
        await nextFrame();

        expectTabStop([late!, item], late);
      });
    });

    it('should give the tab stop to the first of the late items defined in reverse order', async () => {
      const [firstTag, lastTag] = [nameCE(), nameCE()];
      const host = createHost();
      const [first] = cloneItems(firstTag, 'first');
      const [last] = cloneItems(lastTag, 'last');

      await mountHost(host, first!, last!);
      defineCE(lastTag, class extends LateItem {});
      await nextFrame();
      defineCE(firstTag, class extends LateItem {});
      await nextFrame();

      expectTabStop([first!, last!], first);
    });

    it('should keep the tab stop of an item put first when a late item behind it is defined', async () => {
      const tag = nameCE();
      const host = createHost();
      const item = createItem({ value: 'item' });
      const [late] = cloneItems(tag, 'late');
      const added = createItem({ value: 'added' });

      await mountHost(host, item, late!);
      host.prepend(added);
      await nextFrame();
      defineCE(tag, class extends LateItem {});
      await nextFrame();

      expectTabStop([added, item, late!], added);
    });

    it('should manage an item added in the task of the definition', async () => {
      const tag = nameCE();
      const host = createHost();
      const [late] = cloneItems(tag, 'late');
      const added = createItem({ value: 'added' });

      await mountHost(host, late!);
      // The slot change finds the late item defined, so only the wait of the
      // first one reads after it.
      host.append(added);
      defineCE(tag, class extends LateItem {});
      await nextFrame();
      late!.focus();
      await userEvent.setup().keyboard('{ArrowRight}');

      expect(document.activeElement).toBe(added);
    });

    it('should not manage an item that left the slot before its definition', async () => {
      const tag = nameCE();
      const host = createHost();
      const [late] = cloneItems(tag, 'late');
      const item = createItem({ value: 'item' });

      await mountHost(host, late!, item);
      late!.remove();
      await nextFrame();
      document.body.append(late!);
      defineCE(
        tag,
        // Without a `tabindex` of its own.
        class extends ItemBase {},
      );
      await nextFrame();

      expect(late!.hasAttribute('tabindex')).toBe(false);
      expectTabStop([item], item);
    });

    it('should not upgrade an item that left the slot before its definition', async () => {
      const tag = nameCE();
      const host = createHost();
      const [late] = cloneItems(tag, 'late');

      await mountHost(host, late!);
      late!.remove();
      await nextFrame();
      defineCE(tag, class extends LateItem {});
      await nextFrame();

      expect(late!.matches(':defined')).toBe(false);
    });

    it('should not reject for a customized built-in element that is not defined', async () => {
      const reasons: unknown[] = [];
      const onRejection = (event: PromiseRejectionEvent) => {
        event.preventDefault();
        reasons.push(event.reason);
      };
      const host = createHost();
      const template = document.createElement('template');
      template.innerHTML = `<button is="${nameCE()}"></button>`;

      addEventListener('unhandledrejection', onRejection);
      host.append(template.content);
      document.body.append(host);
      await nextFrame();
      await nextFrame();
      removeEventListener('unhandledrejection', onRejection);

      expect(reasons).toEqual([]);
    });
  });

  describe('items that cannot take focus', () => {
    const WAYS = [
      { attribute: 'hidden', way: 'hidden' },
      { attribute: 'disabled', way: 'disabled' },
    ] as const;

    async function mountThree(hostValue?: string) {
      const host = createHost({ dir: 'ltr' });
      const items = ['first', 'second', 'third'].map((value) =>
        createItem({ value }),
      );

      if (hostValue) {
        host.value = hostValue;
      }

      await mountHost(host, ...items);

      return [host, items as [TestItem, TestItem, TestItem]] as const;
    }

    describe.each(WAYS)('$way', ({ attribute }) => {
      it('should move the tab stop off the item that has it', async () => {
        const [, items] = await mountThree();

        items[0][attribute] = true;
        await nextFrame();

        expectTabStop(items, items[1]);
      });

      it('should move the tab stop off the item of the host value', async () => {
        const [, items] = await mountThree('second');

        items[1][attribute] = true;
        await nextFrame();

        expectTabStop(items, items[0]);
      });

      it('should give the tab stop back to the first item', async () => {
        const [, items] = await mountThree();

        items[0][attribute] = true;
        await nextFrame();
        items[0][attribute] = false;
        await nextFrame();

        expectTabStop(items, items[0]);
      });

      it('should give the tab stop back to the item that focus chose', async () => {
        const [, items] = await mountThree();

        items[1].focus();
        items[1].blur();
        items[1][attribute] = true;
        await nextFrame();
        const between = items.map((item) => item.tabIndex);
        items[1][attribute] = false;
        await nextFrame();

        expect(between).toEqual([0, -1, -1]);
        expectTabStop(items, items[1]);
      });

      it('should keep the tab stop that focus chose when the first item is available again', async () => {
        const [, items] = await mountThree();

        items[0][attribute] = true;
        await nextFrame();
        items[2].focus();
        items[0][attribute] = false;
        await nextFrame();

        expectTabStop(items, items[2]);
      });

      it('should choose the tab stop again for an item added later', async () => {
        const [host, items] = await mountThree();
        const added = createItem({ value: 'added' });
        host.prepend(added);
        await nextFrame();

        added[attribute] = true;
        await nextFrame();

        expectTabStop([added, ...items], items[0]);
      });

      it('should ignore an item that left the slot', async () => {
        const [, items] = await mountThree('second');
        const [left] = items;
        left.remove();
        await nextFrame();
        items[2].focus();

        left[attribute] = true;
        await nextFrame();

        // Another choice would give it back to the item of the host value.
        expectTabStop(items.slice(1), items[2]);
      });

      it('should have no tab stop when no item can take focus', async () => {
        const [, items] = await mountThree();

        for (const item of items) {
          item[attribute] = true;
        }

        await nextFrame();

        expectTabStop(items);
      });

      it('should choose the tab stop in a host that was built while out', async () => {
        const host = createHost();
        const first = createItem({ value: 'first' });
        const second = createItem({ value: 'second' });
        first[attribute] = true;
        host.append(first, second);
        await nextFrame();

        document.body.append(host);
        await nextFrame();

        expectTabStop([first, second], second);
      });

      it('should choose the tab stop in a host that was changed while out', async () => {
        const [host, items] = await mountThree();
        host.remove();
        await nextFrame();
        items[0][attribute] = true;
        await nextFrame();

        document.body.append(host);
        await nextFrame();

        expectTabStop(items, items[1]);
      });
    });

    it('should not give the tab stop to an item hidden in the markup', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      first.hidden = true;

      await mountHost(host, first, second);

      expectTabStop([first, second], second);
    });

    it('should not give the tab stop to a hidden item of a later definition', async () => {
      const tag = nameCE();
      const host = createHost();
      const late = document.createElement(tag);
      const second = createItem({ value: 'second' });
      late.hidden = true;
      await mountHost(host, late, second);

      defineCE(tag, class extends TestItem {});
      await nextFrame();

      expectTabStop([late, second], second);
    });

    it.each([
      { from: 0, key: '{ArrowRight}', off: 1, to: 2 },
      { from: 2, key: '{ArrowLeft}', off: 1, to: 0 },
      { from: 2, key: '{ArrowRight}', off: 0, to: 1 },
      { from: 2, key: '{Home}', off: 0, to: 1 },
      { from: 0, key: '{End}', off: 2, to: 1 },
    ])(
      'should skip a hidden item $off on $key from item $from',
      async ({ from, key, off, to }) => {
        const [, items] = await mountThree();
        items[off]!.hidden = true;
        await nextFrame();

        items[from]!.focus();
        await userEvent.setup().keyboard(key);

        expect(document.activeElement).toBe(items[to]);
        expectTabStop(items, items[to]);
      },
    );

    it('should skip an item on an arrow key that a style alone hides', async () => {
      const [, items] = await mountThree();

      items[0].focus();
      items[1].style.display = 'none';
      await userEvent.setup().keyboard('{ArrowRight}');

      expect(document.activeElement).toBe(items[2]);
    });

    describe("hidden and shown by a page's display", () => {
      it('should keep the tab stop', async () => {
        const [, items] = await mountThree();

        items[0].style.display = 'block';
        items[0].hidden = true;
        await nextFrame();

        expectTabStop(items, items[0]);
      });

      it('should take focus from an arrow key', async () => {
        const [, items] = await mountThree();

        items[1].style.display = 'block';
        items[1].hidden = true;
        await nextFrame();
        items[0].focus();
        await userEvent.setup().keyboard('{ArrowRight}');

        expect(document.activeElement).toBe(items[1]);
      });
    });
  });

  describe('keyboard navigation', () => {
    it('should focus the first enabled item on Home', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      third.focus();
      await userEvent.setup().keyboard('{Home}');

      expect(document.activeElement).toBe(first);
      expectTabStop([first, second, third], first);
    });

    it('should focus the last enabled item on End', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      first.focus();
      await userEvent.setup().keyboard('{End}');

      expect(document.activeElement).toBe(third);
      expectTabStop([first, second, third], third);
    });

    it('should move to the previous enabled item on ArrowLeft in LTR', async () => {
      const host = createHost({ dir: 'ltr' });
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      second.focus();
      await userEvent.setup().keyboard('{ArrowLeft}');

      expect(document.activeElement).toBe(first);
      expectTabStop([first, second, third], first);
    });

    it('should move to the next enabled item on ArrowRight in LTR', async () => {
      const host = createHost({ dir: 'ltr' });
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      second.focus();
      await userEvent.setup().keyboard('{ArrowRight}');

      expect(document.activeElement).toBe(third);
      expectTabStop([first, second, third], third);
    });

    it('should wrap around when step navigation reaches an edge', async () => {
      const host = createHost({ dir: 'ltr' });
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      third.focus();
      await userEvent.setup().keyboard('{ArrowRight}');

      expect(document.activeElement).toBe(first);
      expectTabStop([first, second, third], first);
    });

    it('should skip disabled items during step navigation', async () => {
      const host = createHost({ dir: 'ltr' });
      const first = createItem({ value: 'first' });
      const second = createItem({ disabled: true, value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      first.focus();
      await userEvent.setup().keyboard('{ArrowRight}');

      expect(document.activeElement).toBe(third);
      expectTabStop([first, second, third], third);
    });

    it('should prevent default when Home or End handles navigation', async () => {
      const host = createHost();
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      third.focus();
      const homeDefaultPrevented = await press(host, '{Home}');

      expect(homeDefaultPrevented).toBeTruthy();

      first.focus();
      const endDefaultPrevented = await press(host, '{End}');

      expect(endDefaultPrevented).toBeTruthy();
    });

    it('should prevent default when arrow navigation resolves to an already checked item', async () => {
      const host = createHost({ dir: 'ltr' });
      const first = createItem({ value: 'first' });
      const second = createItem({ checked: true, value: 'second' });

      await mountHost(host, first, second);

      first.focus();
      const defaultPrevented = await press(host, '{ArrowRight}');

      expect(defaultPrevented).toBeTruthy();
      expect(document.activeElement).toBe(second);
      expectTabStop([first, second], second);
    });

    it('should not prevent default when there is no enabled navigation target', async () => {
      const host = createHost();
      const first = createItem({ disabled: true, value: 'first' });
      const second = createItem({ disabled: true, value: 'second' });
      const user = userEvent.setup();

      await mountHost(host, first, second);

      host.tabIndex = 0;
      await user.tab();

      const prevented = watchDefaultPrevented(document);

      await user.keyboard('{Home}');

      expect(document.activeElement).toBe(host);
      expect(prevented.at(-1)).toBeFalsy();
      expectTabStop([first, second]);
    });

    it('should emit input and change when navigation lands on an unchecked item', async () => {
      const host = createHost({ dir: 'ltr' });
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const selection = watchSelection(second);

      await mountHost(host, first, second);

      first.focus();
      await userEvent.setup().keyboard('{ArrowRight}');

      expect(selection.input).toHaveBeenCalledOnce();
      expect(selection.change).toHaveBeenCalledOnce();
    });

    it('should emit native radio-like selection events in order', async () => {
      const host = createHost({ dir: 'ltr' });
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const events: Event[] = [];

      second.addEventListener('input', (event) => {
        events.push(event);
      });
      second.addEventListener('change', (event) => {
        events.push(event);
      });

      await mountHost(host, first, second);

      first.focus();
      await userEvent.setup().keyboard('{ArrowRight}');

      expect(events.map(({ type }) => type)).toEqual(['input', 'change']);
      expect(
        events.map(({ bubbles, cancelable, composed }) => ({
          bubbles,
          cancelable,
          composed,
        })),
      ).toEqual([
        { bubbles: true, cancelable: false, composed: true },
        { bubbles: true, cancelable: false, composed: false },
      ]);
    });

    it('should not emit input and change when navigation lands on a checked item', async () => {
      const host = createHost({ dir: 'ltr' });
      const first = createItem({ value: 'first' });
      const second = createItem({ checked: true, value: 'second' });
      const selection = watchSelection(second);

      await mountHost(host, first, second);

      first.focus();
      await userEvent.setup().keyboard('{ArrowRight}');

      expect(selection.input).not.toHaveBeenCalled();
      expect(selection.change).not.toHaveBeenCalled();
    });

    it.each([
      ['Shift', '{Shift>}{ArrowRight}{/Shift}'],
      ['Alt', '{Alt>}{ArrowRight}{/Alt}'],
      ['Ctrl', '{Control>}{ArrowRight}{/Control}'],
      ['Meta', '{Meta>}{ArrowRight}{/Meta}'],
    ])(
      'should ignore modified key combo: %s',
      async (_modifierName, shortcut) => {
        const host = createHost({ dir: 'ltr' });
        const first = createItem({ value: 'first' });
        const second = createItem({ value: 'second' });

        await mountHost(host, first, second);

        first.focus();

        const defaultPrevented = await press(host, shortcut);

        expect(defaultPrevented).toBeFalsy();
        expect(document.activeElement).toBe(first);
        expectTabStop([first, second], first);
      },
    );
  });

  describe('RTL behavior', () => {
    it('should mirror ArrowLeft to next-item navigation in RTL', async () => {
      const host = createHost({ dir: 'rtl' });
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      second.focus();
      await userEvent.setup().keyboard('{ArrowLeft}');

      expect(document.activeElement).toBe(third);
      expectTabStop([first, second, third], third);
    });

    it('should mirror ArrowRight to previous-item navigation in RTL', async () => {
      const host = createHost({ dir: 'rtl' });
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      second.focus();
      await userEvent.setup().keyboard('{ArrowRight}');

      expect(document.activeElement).toBe(first);
      expectTabStop([first, second, third], first);
    });

    it('should mirror ArrowUp to next-item navigation in RTL', async () => {
      const host = createHost({ dir: 'rtl' });
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      second.focus();
      await userEvent.setup().keyboard('{ArrowUp}');

      expect(document.activeElement).toBe(third);
      expectTabStop([first, second, third], third);
    });

    it('should mirror ArrowDown to previous-item navigation in RTL', async () => {
      const host = createHost({ dir: 'rtl' });
      const first = createItem({ value: 'first' });
      const second = createItem({ value: 'second' });
      const third = createItem({ value: 'third' });

      await mountHost(host, first, second, third);

      second.focus();
      await userEvent.setup().keyboard('{ArrowDown}');

      expect(document.activeElement).toBe(first);
      expectTabStop([first, second, third], first);
    });
  });
});
