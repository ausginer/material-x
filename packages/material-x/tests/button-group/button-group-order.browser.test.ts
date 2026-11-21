import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import '../../src/button/button.ts';
import { nextFrame } from '../browser.ts';

// This file imports no group module statically: the group is defined only
// after its buttons have upgraded.

function nativeOf(button: Element): HTMLButtonElement {
  return $<HTMLButtonElement>(button as HTMLElement, 'button')!;
}

describe('mx-button-group defined after its buttons', () => {
  it('should apply its disabled state and size to buttons that upgraded first', async () => {
    const undefinedBefore = customElements.get('mx-button-group') === undefined;
    document.body.innerHTML = `<mx-button-group disabled size="large">
  <mx-button>One</mx-button>
  <mx-button>Two</mx-button>
</mx-button-group>`;
    await import('../../src/button-group/button-group.ts');
    await nextFrame();
    const buttons = [...document.querySelectorAll('mx-button')];

    expect([
      undefinedBefore,
      buttons.map((button) => nativeOf(button).disabled),
      buttons.map((button) => button.matches(':state(large)')),
    ]).toEqual([true, [true, true], [true, true]]);
  });
});

describe('mx-connected-button-group defined after its buttons', () => {
  it('should apply its disabled state and size to buttons that upgraded first', async () => {
    const undefinedBefore =
      customElements.get('mx-connected-button-group') === undefined;
    // No whitespace between the buttons: the group's slot callback reads
    // `dataset` from every assigned node, and a text node has none.
    document.body.innerHTML =
      '<mx-connected-button-group disabled size="large"><mx-button>One</mx-button><mx-button>Two</mx-button></mx-connected-button-group>';
    await import('../../src/button-group/connected-button-group.ts');
    await nextFrame();
    const buttons = [...document.querySelectorAll('mx-button')];

    expect([
      undefinedBefore,
      buttons.map((button) => nativeOf(button).disabled),
      buttons.map((button) => button.matches(':state(large)')),
    ]).toEqual([true, [true, true], [true, true]]);
  });
});
