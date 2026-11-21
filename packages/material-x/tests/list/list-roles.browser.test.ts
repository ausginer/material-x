import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import { nextFrame } from '../browser.ts';
import type { AccessibilityNode } from '../support/accessibility-commands.node.ts';

const TAB = server.browser === 'safari' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';

type ItemTag = 'mx-list-item' | 'mx-list-button-item' | 'mx-list-link-item';

const ITEM_CASES = [
  { tag: 'mx-list-item', disabled: false },
  { tag: 'mx-list-button-item', disabled: false },
  { tag: 'mx-list-button-item', disabled: true },
  { tag: 'mx-list-link-item', disabled: false },
  { tag: 'mx-list-link-item', disabled: true },
] as const;

function createItem(
  tag: ItemTag,
  label: string,
  disabled = false,
): HTMLElement {
  const item = document.createElement(tag);
  item.textContent = label;

  if (tag === 'mx-list-link-item') {
    item.setAttribute('href', '#target');
  }
  item.toggleAttribute('disabled', disabled);
  return item;
}

function createList(
  items: ReadonlyArray<Readonly<{ tag: ItemTag; disabled: boolean }>>,
): HTMLElement {
  const list = document.createElement('mx-list');
  list.id = 'list';
  list.append(
    ...items.map(({ tag, disabled }, index) =>
      createItem(tag, `Item ${index}`, disabled),
    ),
  );
  document.body.append(list);
  return list;
}

function getControl(item: HTMLElement): HTMLElement {
  return $<HTMLElement>(item, '.host')!;
}

/** The `listitem` nodes reached from `node` through `generic` nodes only. */
function listItemsBelow(node: AccessibilityNode): AccessibilityNode[] {
  return node.children.flatMap((child) => {
    if (child.role === 'listitem') {
      return [child];
    }

    return child.role === 'generic' ? listItemsBelow(child) : [];
  });
}

describe('mx-list item roles', () => {
  describe.each(ITEM_CASES)(
    '$tag, disabled: $disabled',
    ({ tag, disabled }) => {
      it('should have no element with a role attribute in its shadow tree', () => {
        const [item] = createList([{ tag, disabled }]).children;

        expect(item!.shadowRoot!.querySelectorAll('[role]')).toHaveLength(0);
      });

      it('should leave the host without a role attribute', () => {
        const [item] = createList([{ tag, disabled }]).children;

        expect(item!.hasAttribute('role')).toBe(false);
      });

      it('should give the host a box', () => {
        const [item] = createList([{ tag, disabled }]).children;

        expect(getComputedStyle(item!).display).toBe(
          tag === 'mx-list-item' ? 'flex' : 'block',
        );
      });
    },
  );

  it("should hold only the shared content in mx-list-item's shadow root", () => {
    const [item] = createList([
      { tag: 'mx-list-item', disabled: false },
    ]).children;
    const root = item!.shadowRoot!;

    expect(
      [...root.children].map(
        (child) => `${child.localName}.${child.className}`,
      ),
    ).toEqual(['slot.lead', 'div.content', 'slot.trail']);
    expect(root.querySelector('.host')).toBeNull();
  });

  it.each([
    { tag: 'mx-list-button-item', control: 'button' },
    { tag: 'mx-list-link-item', control: 'a' },
  ] as const)(
    "should hold only the native control in $tag's shadow root",
    ({ tag, control }) => {
      const [item] = createList([{ tag, disabled: false }]).children;

      expect(
        [...item!.shadowRoot!.children].map((child) => child.localName),
      ).toEqual([control]);
      expect(getControl(item as HTMLElement).localName).toBe(control);
    },
  );

  it('should tab through the enabled controls and past a disabled link item', async () => {
    const list = createList([
      { tag: 'mx-list-button-item', disabled: false },
      { tag: 'mx-list-link-item', disabled: true },
      { tag: 'mx-list-link-item', disabled: false },
    ]);
    const after = document.createElement('button');
    document.body.append(after);
    const [button, , link] = list.children as unknown as HTMLElement[];
    const reached: Element[] = [];

    for (let step = 0; step < 3; step += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one key press per step
      await userEvent.keyboard(TAB);
      const active = document.activeElement!;

      reached.push(active.shadowRoot?.activeElement ?? active);
    }

    expect(reached).toEqual([getControl(button!), getControl(link!), after]);
  });

  describe.each(['mx-list-item', 'mx-list-button-item'] as const)(
    '%s lifted by the list',
    (tag) => {
      const LIFT_STYLES = ['padding', 'overflow', 'background-color'] as const;

      // Grabs the item from the keyboard, which makes core's reorderable trait
      // lift it into the top layer, and reads what the lift must keep.
      const lift = async () => {
        const list = createList([
          { tag: 'mx-list-item', disabled: false },
          { tag, disabled: false },
          { tag: 'mx-list-item', disabled: false },
        ]);
        list.style.gap = '12px';
        list.toggleAttribute('reorderable', true);
        const [, item, next] = list.children as unknown as HTMLElement[];
        const handle = document.createElement('span');
        handle.slot = 'trail';
        handle.dataset['handle'] = '';
        handle.textContent = 'Grip';
        item!.append(handle);

        await nextFrame();

        const read = () => {
          const style = getComputedStyle(item!);

          return {
            list: list.getBoundingClientRect().height,
            next: next!.getBoundingClientRect().top,
            rect: item!.getBoundingClientRect().toJSON() as unknown,
            styles: LIFT_STYLES.map((name) => style.getPropertyValue(name)),
          };
        };
        const before = read();

        handle.focus();
        await userEvent.keyboard(' ');

        return { item: item!, before, lifted: read() };
      };

      it('should lift the host into the top layer', async () => {
        const { item } = await lift();

        expect(item.matches(':popover-open')).toBe(true);
      });

      it('should keep the list and the next item where they were', async () => {
        const { before, lifted } = await lift();

        expect([lifted.list, lifted.next]).toEqual([before.list, before.next]);
      });

      it("should keep the host's rect, padding, overflow and background", async () => {
        const { before, lifted } = await lift();

        expect([lifted.rect, lifted.styles]).toEqual([
          before.rect,
          before.styles,
        ]);
      });

      it('should remove the popover attribute after the lift ends', async () => {
        const { item } = await lift();

        await userEvent.keyboard('{Escape}');

        await expect.poll(() => item.hasAttribute('popover')).toBe(false);
      });
    },
  );

  // The tree is read through CDP, which Playwright opens only in Chromium.
  // Firefox's and WebKit's trees are read by the record's probe.
  describe.runIf(server.browser === 'chromium')(
    "Chromium's accessibility tree",
    () => {
      const read = async (): Promise<AccessibilityNode> => {
        createList(ITEM_CASES);
        await nextFrame();
        return await commands.readAccessibilityTree('#list');
      };

      it('should expose one listitem per item, in DOM order, below the list', async () => {
        const tree = await read();

        expect(tree.role).toBe('list');
        expect(listItemsBelow(tree)).toHaveLength(ITEM_CASES.length);
      });

      it("should keep each item's content and control inside its listitem", async () => {
        const controls = listItemsBelow(await read()).map(({ children }) =>
          children.map(({ role, name }) => ({ role, name })),
        );

        expect(controls).toEqual([
          [{ role: 'generic', name: '' }],
          [{ role: 'button', name: 'Item 1' }],
          [{ role: 'button', name: 'Item 2' }],
          [{ role: 'link', name: 'Item 3' }],
          [{ role: 'link', name: 'Item 4' }],
        ]);
      });
    },
  );
});
