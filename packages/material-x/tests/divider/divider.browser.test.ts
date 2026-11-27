import { afterEach, describe, expect, it } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import type Divider from '../../src/divider/divider.ts';
import '../../src/card/card.ts';
import '../../src/divider/divider.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list.ts';
import { nextFrame } from '../browser.ts';

const TAB = server.browser === 'safari' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';

function createDivider(
  ...attributes: ReadonlyArray<[string, string]>
): Divider {
  const divider = document.createElement('mx-divider');
  for (const [name, value] of attributes) {
    divider.setAttribute(name, value);
  }
  document.body.append(divider);
  return divider;
}

afterEach(() => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});

describe('mx-divider', () => {
  describe.each([
    ['inset', 'start', 'middle'],
    ['orientation', 'horizontal', 'vertical'],
  ] as const)('%s', (name, first, second) => {
    it('should be null by default', () => {
      expect(createDivider()[name]).toBeNull();
    });

    it('should reflect the property to the attribute', () => {
      const divider = createDivider();

      divider[name] = first as never;

      expect(divider.getAttribute(name)).toBe(first);
    });

    it('should read the attribute through the property', () => {
      const divider = createDivider([name, second]);

      expect(divider[name]).toBe(second);
    });

    it('should remove the attribute when the property is null', () => {
      const divider = createDivider([name, first]);

      divider[name] = null;

      expect(divider.hasAttribute(name)).toBe(false);
    });

    it('should replace the previous state when the value changes', () => {
      const divider = createDivider([name, first]);

      divider.setAttribute(name, second);

      expect({
        [first]: divider.matches(`:state(${first})`),
        [second]: divider.matches(`:state(${second})`),
      }).toEqual({ [first]: false, [second]: true });
    });

    it('should clear the state when the attribute is removed', () => {
      const divider = createDivider([name, first]);

      divider.removeAttribute(name);

      expect(divider.matches(`:state(${first})`)).toBe(false);
    });
  });

  describe('shadow tree', () => {
    it('should hold no element', () => {
      expect(createDivider().shadowRoot!.children).toHaveLength(0);
    });
  });

  describe('focus', () => {
    it('should not be a tab stop', async () => {
      const before = document.createElement('button');
      const after = document.createElement('button');
      document.body.append(before);
      createDivider();
      document.body.append(after);
      before.focus();

      await userEvent.keyboard(TAB);

      expect(document.activeElement).toBe(after);
    });
  });

  // Only Chromium exposes its accessibility tree to the test.
  describe.runIf(server.browser === 'chromium')('accessibility tree', () => {
    async function readTree(selector: string, withText?: boolean) {
      await nextFrame();
      await nextFrame();
      return await commands.readAccessibilityTree(selector, withText);
    }

    // The command reports the node that it is asked for even when the tree
    // ignores it, so a row without a role reads the divider's parent. Chromium
    // gives any element with an `id` a node, so only the separator rows set
    // one. Chromium updates its tree after layout, so each row reads it two
    // frames later.
    it('should add no node directly in the body', async () => {
      createDivider();

      const { children } = await readTree('body');

      expect(children.map(({ role, name }) => ({ role, name }))).toEqual([]);
    });

    it('should add no node to its container', async () => {
      const container = document.createElement('div');
      container.id = 'container';
      container.setAttribute('role', 'group');
      container.innerHTML = '<p>Above</p><mx-divider></mx-divider><p>Below</p>';
      document.body.append(container);

      const { children } = await readTree('#container', true);

      expect(children.map(({ role }) => role)).toEqual([
        'paragraph',
        'paragraph',
      ]);
    });

    it('should leave only list items in mx-list', async () => {
      const list = document.createElement('mx-list');
      list.id = 'list';
      list.innerHTML =
        '<mx-list-item>One</mx-list-item><mx-divider></mx-divider><mx-list-item>Two</mx-list-item>';
      document.body.append(list);

      const { children } = await readTree('#list');

      expect(children.map(({ role }) => role)).toEqual([
        'listitem',
        'listitem',
      ]);
    });

    it('should add no node as a direct child of mx-card', async () => {
      const card = document.createElement('mx-card');
      card.id = 'card';
      card.innerHTML = '<p>Above</p><mx-divider></mx-divider><p>Below</p>';
      document.body.append(card);

      const { children } = await readTree('#card');

      expect(children.map(({ role }) => role)).toEqual([
        'paragraph',
        'paragraph',
      ]);
    });

    it('should be a horizontal separator with role="separator"', async () => {
      createDivider(['id', 'divider'], ['role', 'separator']);

      const { role, properties } = await readTree('#divider');

      expect({ role, orientation: properties['orientation'] }).toEqual({
        role: 'separator',
        orientation: 'horizontal',
      });
    });

    it('should be a vertical separator with orientation="vertical"', async () => {
      createDivider(
        ['id', 'divider'],
        ['role', 'separator'],
        ['orientation', 'vertical'],
      );

      const { properties } = await readTree('#divider');

      expect(properties['orientation']).toBe('vertical');
    });

    it("should keep the page's aria-orientation", async () => {
      createDivider(
        ['id', 'divider'],
        ['role', 'separator'],
        ['orientation', 'vertical'],
        ['aria-orientation', 'horizontal'],
      );

      const { properties } = await readTree('#divider');

      expect(properties['orientation']).toBe('horizontal');
    });
  });
});
