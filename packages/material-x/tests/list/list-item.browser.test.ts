import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import { nextFrame, pixels } from '../browser.ts';

function createItem(
  tag: 'mx-list-item' | 'mx-list-button-item' | 'mx-list-link-item',
): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = 'Item';
  document.body.append(element);
  return element;
}

function getControl(element: HTMLElement): HTMLElement {
  const control = element.shadowRoot!.querySelector<HTMLElement>('.host');

  if (!control) {
    throw new Error('Missing internal list item control');
  }

  return control;
}

describe('mx-list-button-item', () => {
  it('should delegate focus to the native button', () => {
    const element = createItem('mx-list-button-item');

    element.focus();

    expect(element.shadowRoot?.activeElement).toBe(getControl(element));
  });

  it('should leave focus where it was when the host is disabled', () => {
    const other = document.createElement('input');
    document.body.append(other);
    other.focus();
    const element = createItem('mx-list-button-item');
    element.toggleAttribute('disabled', true);

    element.focus();

    expect(document.activeElement).toBe(other);
  });
});

describe('mx-list-link-item', () => {
  it('should delegate focus to the native anchor', () => {
    const element = createItem('mx-list-link-item');
    element.setAttribute('href', '#target');

    element.focus();

    expect(element.shadowRoot?.activeElement).toBe(getControl(element));
  });
});

const LINE_SLOT_CASES = [
  { name: 'support', slots: ['support'], token: 'two-line.container.height' },
  { name: 'overline', slots: ['overline'], token: 'two-line.container.height' },
  {
    name: 'support and overline',
    slots: ['support', 'overline'],
    token: 'three-line.container.height',
  },
] as const;

describe('mx-list-item slotted content', () => {
  let heights: Readonly<Record<string, number>>;

  beforeAll(async () => {
    const tokens = [
      'two-line.container.height',
      'three-line.container.height',
    ] as const;
    const { values } = await commands.resolveTokenContract({
      contract: 'list-item.default',
      state: 'default',
      tokens,
    });

    heights = Object.fromEntries(
      tokens.map((token) => [token, pixels(values[token]!)]),
    );
  }, 120_000);

  it.each(LINE_SLOT_CASES)(
    'should select $token with $name slotted',
    async ({ slots, token }) => {
      const element = createItem('mx-list-item');

      await nextFrame();

      // A static item's host is its box.
      const empty = element.getBoundingClientRect().height;
      const contents = slots.map((slot) => {
        const content = document.createElement('span');
        content.slot = slot;
        content.textContent = slot;
        element.append(content);
        return content;
      });

      await nextFrame();

      expect(element.getBoundingClientRect().height).toBe(heights[token]);

      for (const content of contents) {
        content.remove();
      }
      await nextFrame();

      expect(element.getBoundingClientRect().height).toBe(empty);
    },
  );

  it('should select the large leading video size only while support and overline both have content', async () => {
    const tokens = [
      'leading-video.width',
      'small.leading-video.height',
      'large.leading-video.width',
      'large.leading-video.height',
    ] as const;
    const { values } = await commands.resolveTokenContract({
      contract: 'list-item.default',
      state: 'default',
      tokens,
    });
    const [smallWidth, smallHeight, largeWidth, largeHeight] = tokens.map(
      (token) => pixels(values[token]!),
    );
    const element = createItem('mx-list-item');
    const video = document.createElement('video');
    video.slot = 'lead';
    element.append(video);

    const appendSlotted = (slot: string): HTMLElement => {
      const content = document.createElement('span');
      content.slot = slot;
      content.textContent = slot;
      element.append(content);
      return content;
    };
    const getVideoSize = async (): Promise<readonly number[]> => {
      await nextFrame();
      const { width, height } = video.getBoundingClientRect();
      return [width, height];
    };

    expect(await getVideoSize()).toEqual([smallWidth, smallHeight]);

    const support = appendSlotted('support');

    expect(await getVideoSize()).toEqual([smallWidth, smallHeight]);

    const overline = appendSlotted('overline');

    expect(await getVideoSize()).toEqual([largeWidth, largeHeight]);

    support.remove();
    overline.remove();

    expect(await getVideoSize()).toEqual([smallWidth, smallHeight]);
  });
});

function centerOf(element: HTMLElement): readonly [number, number] {
  const { left, top, width, height } = element.getBoundingClientRect();
  return [left + width / 2, top + height / 2];
}

describe.each(['mx-list-button-item', 'mx-list-link-item'] as const)(
  '%s disabled pointer input',
  (tag) => {
    afterEach(async () => {
      // A row that fails mid-press leaves the button down.
      await commands.pointerRelease().catch(() => {});
    });

    const createDisabledItem = async (): Promise<HTMLElement> => {
      const element = createItem(tag);
      element.setAttribute('href', '#target');
      element.toggleAttribute('disabled', true);
      await nextFrame();
      return element;
    };

    it('should keep its shape while hovered', async () => {
      const element = await createDisabledItem();
      const control = getControl(element);
      const rest = getComputedStyle(control).borderTopLeftRadius;

      await commands.pointerMove(...centerOf(element), 1);
      await nextFrame();

      expect(getComputedStyle(control).borderTopLeftRadius).toBe(rest);
    });

    it('should keep its shape while pressed', async () => {
      const element = await createDisabledItem();
      const control = getControl(element);
      const rest = getComputedStyle(control).borderTopLeftRadius;

      await commands.pointerPress(...centerOf(element));
      await nextFrame();

      expect(getComputedStyle(control).borderTopLeftRadius).toBe(rest);
    });

    it('should start no ripple when pressed', async () => {
      const element = await createDisabledItem();

      await commands.pointerPress(...centerOf(element));
      await nextFrame();

      expect(element.shadowRoot!.getAnimations()).toEqual([]);
    });

    it('should dispatch no click from a pointer press', async () => {
      const element = await createDisabledItem();
      const clicks: Event[] = [];
      element.addEventListener('click', (event) => {
        clicks.push(event);
      });

      await commands.pointerPress(...centerOf(element));
      await commands.pointerRelease();
      await nextFrame();

      expect(clicks).toEqual([]);
    });
  },
);
