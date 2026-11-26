import { describe, expect, it } from 'vitest';
import { commands, server } from 'vitest/browser';
import '../../src/button/button.ts';
import '../../src/button/icon-button.ts';
import '../../src/button/link-button.ts';
import '../../src/button/split-button.ts';
import '../../src/button/switch-button.ts';
import '../../src/button/switch-icon-button.ts';
import '../../src/fab/fab.ts';
import Icon from '../../src/icon/icon.ts';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import '../../src/text-field/text-field.ts';
import { nextFrame, whenFontsReady } from '../browser.ts';
import type { AccessibilityNode } from '../support/accessibility-commands.node.ts';

const LIGATURE = 'archive';

function icon(attributes = ''): string {
  return `<mx-icon ${attributes}>${LIGATURE}</mx-icon>`;
}

function getSlot(element: Element): HTMLSlotElement {
  return element.shadowRoot!.querySelector('slot')!;
}

describe('mx-icon', () => {
  it('should hide its slot', () => {
    expect(getSlot(document.createElement('mx-icon'))).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('should give its slot a box', () => {
    const element = document.createElement('mx-icon');
    document.body.append(element);

    expect(getComputedStyle(getSlot(element)).display).toBe('inline');
  });

  it('should hide its slot after the slot has its nodes', () => {
    const observer = new MutationObserver(() => {});

    class ObservedIcon extends Icon {
      override attachShadow(init: ShadowRootInit): ShadowRoot {
        const root = super.attachShadow(init);
        observer.observe(root, {
          attributeFilter: ['aria-hidden'],
          attributeOldValue: true,
          childList: true,
          subtree: true,
        });
        return root;
      }
    }

    const tag = 'test-observed-icon';
    document.body.innerHTML = `<${tag}>${LIGATURE}</${tag}>`;
    customElements.define(tag, ObservedIcon);

    // The template's nodes come with their own attributes, in one record.
    expect(
      observer.takeRecords().map(({ type, oldValue }) => [type, oldValue]),
    ).toEqual([
      ['childList', null],
      ['attributes', null],
    ]);
  });

  it('should set no aria-hidden on its host', async () => {
    const element = document.createElement('mx-icon');
    element.textContent = LIGATURE;
    document.body.append(element);
    await nextFrame();

    expect(element.hasAttribute('aria-hidden')).toBe(false);
  });
});

/**
 * The x-height of the text's font, read by a canvas, so it doesn't come from
 * CSS's own `middle`.
 */
function measureXHeight(text: HTMLElement): number {
  const context = document.createElement('canvas').getContext('2d')!;
  context.font = getComputedStyle(text).font;

  return context.measureText('x').actualBoundingBoxAscent;
}

describe.each([16, 24])('mx-icon inline in %ipx text', (size) => {
  const MARKER =
    '<span data-baseline style="display: inline-block; inline-size: 0; block-size: 0"></span>';

  /**
   * How far the icon's middle is from the text's baseline plus half its
   * x-height. The baseline is the bottom margin edge of an empty
   * `inline-block`, which is that box's baseline.
   */
  async function readOffset(html: string, xHeight?: number): Promise<number> {
    document.body.innerHTML = html;
    await whenFontsReady();
    await nextFrame();

    const text = document.querySelector<HTMLElement>('[data-text]')!;
    const baseline = text
      .querySelector('[data-baseline]')!
      .getBoundingClientRect().bottom;
    const { top, height } = text
      .querySelector('mx-icon')!
      .getBoundingClientRect();

    return (
      top + height / 2 - (baseline - (xHeight ?? measureXHeight(text)) / 2)
    );
  }

  // Within 1 px: the canvas reads the ink of the font's "x", which the font's
  // own x-height metric, the one CSS uses, can differ from by a fraction.
  it('should stand its middle on the middle of the lowercase letters of a span', async () => {
    expect(
      Math.abs(
        await readOffset(
          `<p><span data-text style="font-size: ${size}px">Save${icon()}${MARKER}xyz</span></p>`,
        ),
      ),
    ).toBeLessThanOrEqual(1);
  });

  it('should stand its middle on the middle of the lowercase letters of a native button', async () => {
    expect(
      Math.abs(
        await readOffset(
          `<button data-text style="font: inherit; font-size: ${size}px">${icon()}Save${MARKER}</button>`,
        ),
      ),
    ).toBeLessThanOrEqual(1);
  });

  // Roboto's half x-height is near 0.25em, so a fixed offset can pass the
  // rows above. `font-size-adjust` makes the x-height 0.7 of the font size,
  // which no fixed offset near Roboto's matches, and an em of the icon stays
  // the font size.
  it('should follow the x-height of the text', async () => {
    expect(
      Math.abs(
        await readOffset(
          `<p><span data-text style="font-size: ${size}px; font-size-adjust: 0.7">Save${icon()}${MARKER}xyz</span></p>`,
          0.7 * size,
        ),
      ),
    ).toBeLessThanOrEqual(1);
  });
});

// Only Chromium exposes its accessibility tree to the test.
describe.runIf(server.browser === 'chromium')(
  'mx-icon accessibility tree',
  () => {
    async function readTree(html: string): Promise<AccessibilityNode> {
      const fixture = document.createElement('div');
      fixture.id = 'fixture';
      fixture.innerHTML = html;
      document.body.append(fixture);
      await nextFrame();

      return await commands.readAccessibilityTree('#fixture', true);
    }

    function namesOf(node: AccessibilityNode, role: string): readonly string[] {
      return [
        ...(node.role === role ? [node.name] : []),
        ...node.children.flatMap((child) => namesOf(child, role)),
      ];
    }

    /** The names of the role, and whether the tree has the icon's text. */
    async function read(html: string, role: string) {
      const tree = await readTree(html);

      return {
        names: namesOf(tree, role),
        hasIconText: JSON.stringify(tree).includes(LIGATURE),
      };
    }

    it.each([
      [
        'mx-button',
        'button',
        `<mx-button>${icon('slot="icon"')}Save</mx-button>`,
      ],
      [
        'mx-link-button',
        'link',
        `<mx-link-button href="#x">${icon('slot="icon"')}Save</mx-link-button>`,
      ],
      [
        'mx-switch-button',
        'switch',
        `<mx-switch-button>${icon('slot="icon"')}Save</mx-switch-button>`,
      ],
      [
        'extended mx-fab',
        'button',
        `<mx-fab extended="open">${icon('slot="icon"')}Save</mx-fab>`,
      ],
      [
        'mx-list-button-item',
        'button',
        `<mx-list><mx-list-button-item>${icon('slot="lead"')}Save${icon('slot="trail"')}</mx-list-button-item></mx-list>`,
      ],
      [
        'mx-list-link-item',
        'link',
        `<mx-list><mx-list-link-item href="#x">${icon('slot="lead"')}Save${icon('slot="trail"')}</mx-list-link-item></mx-list>`,
      ],
      [
        'mx-text-field',
        'textbox',
        `<mx-text-field><span slot="label">Save</span>${icon('slot="lead"')}${icon('slot="trail"')}</mx-text-field>`,
      ],
    ])(
      'should leave the name of %s as its label alone',
      async (_, role, html) => {
        expect(await read(html, role)).toEqual({
          names: ['Save'],
          hasIconText: false,
        });
      },
    );

    it("should leave the name of mx-split-button's leading button as its label alone", async () => {
      expect(
        await read(
          `<mx-split-button secondarylabel="More">${icon('slot="icon"')}Save</mx-split-button>`,
          'button',
        ),
      ).toEqual({ names: ['Save', 'More'], hasIconText: false });
    });

    describe.each([
      ['mx-icon-button', 'button', ''],
      ['mx-switch-icon-button', 'switch', ''],
      ['mx-fab', 'button', 'slot="icon"'],
    ])('%s with the icon alone', (tag, role, attributes) => {
      it('should take its name from its aria-label', async () => {
        expect(
          await read(
            `<${tag} aria-label="Save">${icon(attributes)}</${tag}>`,
            role,
          ),
        ).toEqual({ names: ['Save'], hasIconText: false });
      });

      it('should have no name without an aria-label', async () => {
        expect(
          await read(`<${tag}>${icon(attributes)}</${tag}>`, role),
        ).toEqual({ names: [''], hasIconText: false });
      });
    });

    it('should name a control by the label of a named icon', async () => {
      expect(
        await read(
          `<mx-button>${icon('slot="icon" role="img" aria-label="Draft"')}Save</mx-button>`,
          'button',
        ),
      ).toEqual({ names: ['Draft Save'], hasIconText: false });
    });

    it('should expose no text alone', async () => {
      expect(JSON.stringify(await readTree(icon()))).not.toContain(LIGATURE);
    });

    it('should expose no text in a static list item', async () => {
      const tree = await readTree(
        `<mx-list><mx-list-item>${icon('slot="lead"')}Save${icon('slot="trail"')}</mx-list-item></mx-list>`,
      );

      expect(JSON.stringify(tree)).not.toContain(LIGATURE);
    });
  },
);
