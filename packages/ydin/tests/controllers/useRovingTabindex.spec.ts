import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRovingTabindex } from '../../src/controllers/useRovingTabindex.ts';
import { ControlledElement } from '../../src/element.ts';
import { Checkable } from '../../src/traits/checkable.ts';
import { Disableable } from '../../src/traits/disableable.ts';
import { impl } from '../../src/traits/traits.ts';
import { Valuable } from '../../src/traits/valuable.ts';
import { cleanupDOM, defineCE, nameCE, nextFrame } from '../browser.ts';

const HostBase = impl(ControlledElement, [Valuable] as const);
const ItemBase = impl(ControlledElement, [
  Checkable,
  Valuable,
  Disableable,
] as const);

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

function defineElement(element: CustomElementConstructor): void {
  defineCE(nameCE(), element);
}

function createHost(options?: {
  readonly dir?: 'ltr' | 'rtl';
  readonly slotName?: string;
  readonly slotSelector?: string;
}): InstanceType<typeof HostBase> & { slotElement: HTMLSlotElement } {
  class Host extends HostBase {
    readonly slotElement: HTMLSlotElement;

    constructor() {
      super();

      const root = this.attachShadow({ mode: 'open' });
      const slotElement = document.createElement('slot');

      if (options?.slotName) {
        slotElement.name = options.slotName;
      }

      root.append(slotElement);
      this.slotElement = slotElement;

      if (options?.dir) {
        this.dir = options.dir;
      }

      useRovingTabindex(this, options?.slotSelector);
    }
  }

  defineElement(Host);

  return new Host();
}

function createItem(options?: {
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly slot?: string;
  readonly value?: string | null;
}): TestItem {
  if (!isTestItemDefined) {
    defineElement(TestItem);
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
    defineElement(ShadowItem);
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
  const input = vi.fn();
  const change = vi.fn();

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

      expect(homeDefaultPrevented).toBe(true);

      first.focus();
      const endDefaultPrevented = await press(host, '{End}');

      expect(endDefaultPrevented).toBe(true);
    });

    it('should prevent default when arrow navigation resolves to an already checked item', async () => {
      const host = createHost({ dir: 'ltr' });
      const first = createItem({ value: 'first' });
      const second = createItem({ checked: true, value: 'second' });

      await mountHost(host, first, second);

      first.focus();
      const defaultPrevented = await press(host, '{ArrowRight}');

      expect(defaultPrevented).toBe(true);
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
      expect(prevented.at(-1)).toBe(false);
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

        expect(defaultPrevented).toBe(false);
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
