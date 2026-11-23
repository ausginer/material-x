// Feature-proof probe for RF-77 and RF-78 (PR #152). Not a row: copied into
// .plan/reviews/elevation-shadow-color-1/probes/ and removed from tests/.
import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '../../src/button/button.ts';
import '../../src/fab/fab.ts';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import { nextFrame } from '../browser.ts';

function boxOf(element: HTMLElement): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>('.host') ?? element;
}

async function mount(fixture: HTMLElement): Promise<HTMLElement> {
  const frame = document.createElement('div');
  frame.style.cssText =
    'display: inline-block; padding: 8px; background: white; inline-size: 240px;';
  frame.append(fixture);
  document.body.append(frame);
  await nextFrame();
  return frame;
}

function resting(tag: string): {
  fixture: HTMLElement;
  component: HTMLElement;
} {
  if (tag === 'mx-button') {
    const button = document.createElement('mx-button');
    button.textContent = 'Button';
    return { fixture: button, component: button };
  }
  const list = document.createElement('mx-list');
  const item = document.createElement(tag);
  item.setAttribute('href', '#');
  item.textContent = 'Item';
  list.append(item);
  return { fixture: list, component: item };
}

const TAGS = [
  'mx-list-item',
  'mx-list-button-item',
  'mx-list-link-item',
  'mx-button',
] as const;

describe('P1: the level-0 screenshot row can see the layers', () => {
  it.each(TAGS)('%s at level 3 differs from its bare paint', async (tag) => {
    const { fixture, component } = resting(tag);
    component.style.setProperty('--_level', '3');
    component.style.setProperty('transition', 'none');
    const frame = await mount(fixture);
    await nextFrame();
    const drawn = await page.screenshot({ element: frame, save: false });
    for (const layer of ['umbra', 'penumbra', 'ambient']) {
      component.style.setProperty(`--_elevation-${layer}`, 'none');
    }
    await nextFrame();
    const bare = await page.screenshot({ element: frame, save: false });
    expect(drawn === bare).toBe(false);
  });
});

describe('P2: the component token wins over the elevation package', () => {
  it.each([
    ['elevated mx-button', 'mx-button', 'elevated'],
    ['mx-fab', 'mx-fab', null],
  ] as const)(
    '%s draws its layers in its own container.shadow-color',
    async (_name, tag, color) => {
      const element = document.createElement(tag);
      if (color) {
        element.setAttribute('color', color);
      }
      element.textContent = 'X';
      // The component's own token, given a value that differs from
      // md.sys.color.shadow, so the default and the token are told apart.
      element.style.setProperty('--_container-shadow-color', 'rgb(255, 0, 0)');
      document.body.append(element);
      await nextFrame();
      const box = boxOf(element);
      const shadows = [
        getComputedStyle(box).boxShadow,
        getComputedStyle(box, '::before').boxShadow,
        getComputedStyle(box, '::after').boxShadow,
      ];
      console.log(tag, JSON.stringify(shadows));
      for (const shadow of shadows) {
        expect(shadow).toMatch(/rgba?\(255, 0, 0|color\(srgb 1 0 0/u);
      }
      element.remove();
    },
  );
});

describe('P3: the list items declare their own shadow colour', () => {
  it.each([
    'mx-list-item',
    'mx-list-button-item',
    'mx-list-link-item',
  ] as const)('%s sets --_shadow-color on its host', async (tag) => {
    const { fixture, component } = resting(tag);
    await mount(fixture);
    const own = getComputedStyle(component).getPropertyValue('--_shadow-color');
    console.log(tag, JSON.stringify(own));
    expect(own.trim()).not.toBe('');
  });
});
