import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/button-group/connected-button-group.ts';
import { nextFrame } from '../browser.ts';

// This file imports no switch module statically: the switches are defined only
// after the group has read its slot.

describe('mx-connected-button-group defined before its switches', () => {
  it('should manage the focus of the switches once they are defined', async () => {
    const undefinedBefore =
      customElements.get('mx-switch-button') === undefined;
    document.body.innerHTML = `<mx-connected-button-group>
  <mx-switch-button value="a">A</mx-switch-button>
  <mx-switch-button value="b">B</mx-switch-button>
</mx-connected-button-group>`;
    await nextFrame();
    await import('../../src/button/switch-button.ts');
    await nextFrame();
    const switches = [
      ...document.querySelectorAll<HTMLElement>('mx-switch-button'),
    ];
    const tabStops = switches.map((element) =>
      element.getAttribute('tabindex'),
    );
    switches[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');

    expect([undefinedBefore, tabStops, document.activeElement]).toEqual([
      true,
      ['0', '-1'],
      switches[1],
    ]);
  });
});
