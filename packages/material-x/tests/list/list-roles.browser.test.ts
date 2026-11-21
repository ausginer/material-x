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
      it('should have exactly one listitem role in its shadow tree', () => {
        const [item] = createList([{ tag, disabled }]).children;

        expect(
          item!.shadowRoot!.querySelectorAll('[role="listitem"]'),
        ).toHaveLength(1);
      });

      it('should put the role on the row that holds the control', () => {
        const [item] = createList([{ tag, disabled }]).children;
        const row = item!.shadowRoot!.querySelector('[role="listitem"]')!;
        const control = getControl(item as HTMLElement);

        // A static item's control is its row.
        expect(row.contains(control)).toBe(true);
        expect(row.parentNode).toBe(item!.shadowRoot);
      });

      it('should leave the host without a role attribute', () => {
        const [item] = createList([{ tag, disabled }]).children;

        expect(item!.hasAttribute('role')).toBe(false);
      });
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

  describe.each(['mx-list-button-item', 'mx-list-link-item'] as const)(
    '%s lifted',
    (tag) => {
      it('should keep the list and the next item where they were', async () => {
        const list = createList([
          { tag: 'mx-list-item', disabled: false },
          { tag, disabled: false },
          { tag: 'mx-list-item', disabled: false },
        ]);
        list.style.gap = '12px';
        const [, item, next] = list.children as unknown as HTMLElement[];

        await nextFrame();

        const read = () => [
          list.getBoundingClientRect().height,
          getControl(next!).getBoundingClientRect().top,
        ];
        const before = read();

        // The steps of core's reorderable trait: a footprint of the control's
        // size before the item, then the control pinned at its rect and shown
        // in the top layer as a manual popover.
        const visual = getControl(item!);
        const rect = visual.getBoundingClientRect();
        const footprint = document.createElement('div');
        footprint.style.width = `${rect.width}px`;
        footprint.style.height = `${rect.height}px`;
        item!.before(footprint);
        Object.assign(visual.style, {
          position: 'fixed',
          inset: 'auto',
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          margin: '0',
          border: '0',
        });
        visual.popover = 'manual';
        visual.showPopover();

        expect(visual.matches(':popover-open')).toBe(true);
        expect(read()).toEqual(before);
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
