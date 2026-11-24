import { afterEach, describe, expect, it, onTestFinished } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import '../../src/list/sortable-list.ts';
import { nextFrame, resolveComputed } from '../browser.ts';
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
  return item.shadowRoot!.querySelector<HTMLElement>('.host')!;
}

/** Adds a document stylesheet for the current test. */
function addPageRule(css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  onTestFinished(() => style.remove());
}

afterEach(async () => {
  // A row that fails mid-gesture leaves the button down.
  await commands.pointerRelease().catch(() => {});
});

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

  it("should make an mx-list-item with a consumer's tabindex a tab stop in mx-list", async () => {
    const list = createList([{ tag: 'mx-list-item', disabled: false }]);
    const [item] = list.children as unknown as HTMLElement[];
    item!.tabIndex = 0;
    const before = document.createElement('button');
    list.before(before);
    before.focus();

    await userEvent.keyboard(TAB);

    expect(document.activeElement).toBe(item);
  });

  describe("mx-list-item's spacing under a page's universal reset", () => {
    const RESET =
      '*, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid; }';

    const slotted = (slot: string, text: string): HTMLElement => {
      const span = document.createElement('span');
      span.slot = slot;
      span.textContent = text;
      return span;
    };

    const FIXTURES: Record<string, () => Array<Node | string>> = {
      'one line': () => [slotted('lead', 'L'), 'Label', slotted('trail', 'T')],
      'two lines': () => [
        slotted('lead', 'L'),
        'Label',
        slotted('support', 'Support'),
        slotted('trail', 'T'),
      ],
      'three lines': () => [
        slotted('lead', 'L'),
        slotted('overline', 'Overline'),
        'Label',
        slotted('support', 'Support'),
        slotted('trail', 'T'),
      ],
      'a label only': () => ['Label'],
      'a lead only': () => [slotted('lead', 'L')],
      'a trail only': () => [slotted('trail', 'T')],
    };

    /** The item's box in the list, and its shadow children's boxes in the item. */
    const read = async (content: () => Array<Node | string>) => {
      const list = document.createElement('mx-list');
      list.style.width = '360px';
      const item = document.createElement('mx-list-item');
      item.append(...content());
      list.append(item);
      document.body.append(list);
      await nextFrame();
      const origin = list.getBoundingClientRect();
      const box = item.getBoundingClientRect();
      const relative = (rect: DOMRect, to: DOMRect) => [
        rect.left - to.left,
        rect.top - to.top,
        rect.width,
        rect.height,
      ];
      const reading = [
        relative(box, origin),
        ...['.lead', '.content', '.trail'].map((selector) =>
          relative(
            item
              .shadowRoot!.querySelector<HTMLElement>(selector)!
              .getBoundingClientRect(),
            box,
          ),
        ),
      ];
      list.remove();
      return reading;
    };

    it.each(Object.keys(FIXTURES))(
      'should keep the boxes of an item with %s',
      async (name) => {
        const plain = await read(FIXTURES[name]!);
        addPageRule(RESET);

        expect(await read(FIXTURES[name]!)).toEqual(plain);
      },
    );
  });

  describe.each(['mx-list-item', 'mx-list-button-item'] as const)(
    '%s lifted by mx-sortable-list',
    (tag) => {
      const LIFT_STYLES = ['padding', 'overflow'] as const;
      const POPOVER_RULE =
        '[popover] { padding: 16px; background: red; overflow: auto; color: blue; }';

      // Lifts the item with drag's lift, through real pointer input held past
      // the threshold and back to the grab point, and reads what the lift must
      // keep.
      const lift = async () => {
        const list = document.createElement('mx-sortable-list');
        list.style.gap = '12px';
        list.style.setProperty('--_drag-duration', '0s');
        const item = createItem(tag, 'Item 1');
        item.id = 's';
        const next = createItem('mx-list-item', 'Item 2');
        list.append(createItem('mx-list-item', 'Item 0'), item, next);
        document.body.append(list);
        await nextFrame();

        const read = () => {
          const style = getComputedStyle(item);

          return {
            list: list.getBoundingClientRect().height,
            next: next.getBoundingClientRect().top,
            rect: item.getBoundingClientRect().toJSON() as unknown,
            styles: LIFT_STYLES.map((name) => style.getPropertyValue(name)),
          };
        };
        const before = read();
        const { left, top, width, height } = item.getBoundingClientRect();
        const [x, y] = [left + width / 2, top + height / 2];

        await commands.pointerPress(x, y);
        await commands.pointerMove(x, y + 12, 3);
        await commands.pointerMove(x, y, 3);
        await nextFrame();

        return { item, before, lifted: read() };
      };

      it('should lift the host into the top layer', async () => {
        const { item } = await lift();

        expect(item.matches(':popover-open')).toBe(true);
      });

      it('should keep the list and the next item where they were', async () => {
        const { before, lifted } = await lift();

        expect([lifted.list, lifted.next]).toEqual([before.list, before.next]);
      });

      const RULE_CASES: ReadonlyArray<readonly [string, string]> = [
        ['no page rule', ''],
        ['a page rule for popovers', POPOVER_RULE],
        ...(tag === 'mx-list-item'
          ? ([
              [
                "the consumer's rule on the item",
                '#s { padding-inline: 24px; background-color: rgb(0, 0, 255); }',
              ],
            ] as const)
          : []),
      ];

      it.each(RULE_CASES)(
        "should keep the host's rect, padding and overflow with %s",
        async (_, rule) => {
          if (rule) {
            addPageRule(rule);
          }
          const { before, lifted } = await lift();

          expect([lifted.rect, lifted.styles]).toEqual([
            before.rect,
            before.styles,
          ]);
        },
      );

      if (tag === 'mx-list-item') {
        it.each(RULE_CASES)(
          'should take the reorder container and label colors with %s',
          async (_, rule) => {
            if (rule) {
              addPageRule(rule);
            }
            const { item } = await lift();
            const { values } = await commands.resolveTokenContract({
              contract: 'list.reorder',
              state: 'lifted',
              tokens: ['container.color', 'label-text.color'],
            });
            const { backgroundColor, color } = getComputedStyle(item);

            expect([backgroundColor, color]).toEqual([
              resolveComputed('color', String(values['container.color'])),
              resolveComputed('color', String(values['label-text.color'])),
            ]);
          },
        );

        it("should have the page's background-color at rest and after the drop", async () => {
          addPageRule('#s { background-color: rgb(0, 0, 255); }');
          const { item } = await lift();
          await commands.pointerRelease();
          await expect.poll(() => item.hasAttribute('popover')).toBe(false);

          expect(getComputedStyle(item).backgroundColor).toBe('rgb(0, 0, 255)');
        });
      }

      it('should remove the popover attribute after the lift ends', async () => {
        const { item } = await lift();

        await commands.pointerRelease();

        await expect.poll(() => item.hasAttribute('popover')).toBe(false);
      });
    },
  );

  it.each(['mx-list-item', 'mx-list-button-item'] as const)(
    "should raise the lifted %s's elevation over the drag's duration",
    async (tag) => {
      const list = document.createElement('mx-sortable-list');
      const item = createItem(tag, 'Item 0');
      list.append(item, createItem('mx-list-item', 'Item 1'));
      document.body.append(list);
      await nextFrame();
      const level = (): number =>
        Number(getComputedStyle(item).getPropertyValue('--_level'));
      const rest = level();
      const { left, top, width, height } = item.getBoundingClientRect();
      const [x, y] = [left + width / 2, top + height / 2];

      await commands.pointerPress(x, y);
      await commands.pointerMove(x, y + 12, 3);
      await expect.poll(() => item.matches(':state(drag)')).toBe(true);
      const raised = Number(
        getComputedStyle(item).getPropertyValue('--_container-elevation'),
      );
      // The first reading that has left the rest level is still below the
      // raised one, unless the level jumped.
      await expect.poll(level).toBeGreaterThan(rest);
      const rising = level();

      expect([rest, raised, rising < raised]).toEqual([0, 8, true]);
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
