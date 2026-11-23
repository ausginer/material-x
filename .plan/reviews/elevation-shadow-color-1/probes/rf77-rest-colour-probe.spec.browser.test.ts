// Feature-proof probe for RF-77 (PR #152): can a colour row read at level 0
// see the colour? Not a row: copied into
// .plan/reviews/elevation-shadow-color-1/probes/ and removed from tests/.
import { describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/sortable-list.ts';
import { nextFrame } from '../browser.ts';

const LAYER_TOKENS = [
  'elevation.penumbra',
  'elevation.umbra',
  'elevation.ambient',
] as const;

async function expectedLayers(level: string | number, shadowColor: string) {
  const { values } = await commands.resolveTokenContract({
    contract: 'elevation',
    state: 'default',
    tokens: LAYER_TOKENS,
  });
  const resolve = (token: (typeof LAYER_TOKENS)[number]): string => {
    const probe = document.createElement('div');
    probe.style.setProperty('--_level', String(level));
    probe.style.setProperty('--_shadow-color', shadowColor);
    probe.style.setProperty(
      'box-shadow',
      String(values[token]!).replace(/;$/u, ''),
    );
    document.body.append(probe);
    const shadow = getComputedStyle(probe).boxShadow;
    probe.remove();
    return shadow;
  };
  return {
    penumbra: resolve('elevation.penumbra'),
    umbra: resolve('elevation.umbra'),
    ambient: resolve('elevation.ambient'),
  };
}

function renderedLayers(box: Element) {
  return {
    penumbra: getComputedStyle(box).boxShadow,
    umbra: getComputedStyle(box, '::before').boxShadow,
    ambient: getComputedStyle(box, '::after').boxShadow,
  };
}

function boxOf(element: HTMLElement): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>('.host') ?? element;
}

describe('P4: a level-0 colour row and a wrong colour', () => {
  it.each([
    ['mx-list-link-item at rest (level 0)', 'mx-list-link-item', 0],
    ['mx-list-item at level 1', 'mx-list-item', 1],
  ] as const)('%s: red drawn, black expected', async (_name, tag, level) => {
    const list = document.createElement('mx-sortable-list');
    const item = document.createElement(tag);
    item.setAttribute('href', '#');
    item.textContent = 'A';
    list.append(item);
    document.body.append(list);
    // The box is drawn in a colour that its token package doesn't give.
    item.style.setProperty('--_shadow-color', 'rgb(255, 0, 0)');
    if (level) {
      item.style.setProperty('--_level', String(level));
    }
    await nextFrame();
    const drawn = renderedLayers(boxOf(item));
    const expected = await expectedLayers(level, 'rgb(0, 0, 0)');
    console.log(tag, JSON.stringify({ drawn, expected }));
    // Passes when the row can't tell red from black.
    expect(drawn).toEqual(expected);
    list.remove();
  });
});
