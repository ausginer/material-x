import { describe, expect, it } from 'vitest';
import '../../src/button/switch-button.ts';
import { nextFrame } from '../browser.ts';

// This file imports no group module statically: the group is defined only
// after its switches have upgraded.

describe('mx-connected-button-group defined after its switches', () => {
  it('should select the switch whose value equals the group value', async () => {
    const undefinedBefore =
      customElements.get('mx-connected-button-group') === undefined;
    // No whitespace between the switches: the group's slot callback reads
    // `dataset` from every assigned node, and a text node has none.
    document.body.innerHTML =
      '<mx-connected-button-group value="b"><mx-switch-button value="a" checked>A</mx-switch-button><mx-switch-button value="b">B</mx-switch-button></mx-connected-button-group>';
    await import('../../src/button-group/connected-button-group.ts');
    await nextFrame();
    const switches = [
      ...document.querySelectorAll<HTMLElement & { checked: boolean }>(
        'mx-switch-button',
      ),
    ];

    expect([
      undefinedBefore,
      switches.map((element) => element.checked),
    ]).toEqual([true, [false, true]]);
  });
});
