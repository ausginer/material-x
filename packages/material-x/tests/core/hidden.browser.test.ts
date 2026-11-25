import { describe, expect, it, onTestFinished } from 'vitest';
import files from '../../files.json' with { type: 'json' };
import { nextFrame } from '../browser.ts';

const modules = import.meta.glob<unknown>('../../src/**/*.ts');

await Promise.all(
  files.runtime.map(async (entry) => await modules[`../../src/${entry}.ts`]!()),
);

const TAGS = files.runtime.map((entry) => `mx-${entry.split('/').at(-1)!}`);

async function create(
  tag: string,
  attributes: Readonly<Record<string, string>> = {},
): Promise<HTMLElement> {
  const element = document.createElement(tag);

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  element.textContent = 'Text';
  document.body.append(element);
  await nextFrame();
  return element;
}

function displayOf(element: Element): string {
  return getComputedStyle(element).display;
}

/** The elements that have a box: `element` and its whole shadow tree. */
function boxes(element: HTMLElement): readonly Element[] {
  return [element, ...element.shadowRoot!.querySelectorAll('*')].filter(
    (node) => node.getClientRects().length > 0,
  );
}

function addPageRule(css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  onTestFinished(() => style.remove());
}

describe('hidden', () => {
  describe.each(TAGS)('%s', (tag) => {
    it('should have a box without it', async () => {
      const element = await create(tag);

      expect(boxes(element)).not.toEqual([]);
    });

    it('should be hidden with it', async () => {
      const element = await create(tag, { hidden: '' });

      expect([displayOf(element), boxes(element)]).toEqual(['none', []]);
    });

    it('should be rendered as before when it is removed', async () => {
      const element = await create(tag);
      const before = displayOf(element);
      element.hidden = true;
      const hidden = displayOf(element);
      element.hidden = false;

      expect([hidden, displayOf(element)]).toEqual(['none', before]);
    });

    it.each(['until-found', 'UNTIL-FOUND'])(
      'should keep its display with the value %s',
      async (value) => {
        const element = await create(tag);
        const before = displayOf(element);
        element.setAttribute('hidden', value);

        expect(displayOf(element)).toBe(before);
      },
    );

    it("should keep a page's own display", async () => {
      addPageRule(`${tag} { display: inline-block; }`);
      const element = await create(tag, { hidden: '' });

      expect(displayOf(element)).toBe('inline-block');
    });
  });

  // Any value but `until-found` is the hidden state. The elements share the
  // rule, so one of them reads it.
  it('should hide an element with any other value', async () => {
    const button = await create('mx-button', { hidden: 'true' });

    expect([displayOf(button), boxes(button)]).toEqual(['none', []]);
  });

  describe.each(['mx-icon', 'span'])("a list item's %s avatar", (tag) => {
    async function createAvatar(
      attributes: Readonly<Record<string, string>> = {},
    ): Promise<HTMLElement> {
      const item = document.createElement('mx-list-item');
      document.body.append(item);
      const avatar = await create(tag, {
        slot: 'lead',
        'data-avatar': '',
        ...attributes,
      });
      item.append(avatar);
      await nextFrame();
      return avatar;
    }

    it('should be rendered without it', async () => {
      const avatar = await createAvatar();

      expect(displayOf(avatar)).toBe('grid');
    });

    it('should be hidden with it', async () => {
      const avatar = await createAvatar({ hidden: '' });

      expect([displayOf(avatar), avatar.getClientRects().length]).toEqual([
        'none',
        0,
      ]);
    });

    it.each(['until-found', 'UNTIL-FOUND'])(
      'should keep its display with the value %s',
      async (value) => {
        const avatar = await createAvatar({ hidden: value });

        expect(displayOf(avatar)).toBe('grid');
      },
    );
  });

  it('should hide an extended and disabled FAB', async () => {
    const fab = await create('mx-fab', {
      extended: '',
      disabled: '',
      hidden: '',
    });

    expect([displayOf(fab), boxes(fab)]).toEqual(['none', []]);
  });

  it('should hide a list item that is an open popover', async () => {
    const item = await create('mx-list-item', { popover: 'manual' });
    item.showPopover();
    const before = displayOf(item);
    item.hidden = true;

    expect([before, item.matches(':popover-open'), displayOf(item)]).toEqual([
      'flex',
      true,
      'none',
    ]);
  });

  // No component has such a rule today. A component's sheet precedes this one,
  // so the test's does too.
  it('should outrank a host display of a state', async () => {
    const button = await create('mx-button', {
      disabled: '',
      color: 'outlined',
    });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(
      ':host(:state(disabled):state(outlined)) { display: grid; }',
    );
    button.shadowRoot!.adoptedStyleSheets.unshift(sheet);
    const before = displayOf(button);
    button.hidden = true;

    expect([before, displayOf(button)]).toEqual(['grid', 'none']);
  });
});
