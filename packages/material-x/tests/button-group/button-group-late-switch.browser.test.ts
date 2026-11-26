import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/button-group/connected-button-group.ts';
import { nextFrame } from '../browser.ts';

// This file imports no member's module statically: the members are defined
// only after the group has read its slot.

describe('mx-connected-button-group defined before its members', () => {
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

  it('should mark the ends where a page hides the members until they are defined', async () => {
    const undefinedBefore = customElements.get('mx-button') === undefined;
    document.body.innerHTML = `<style>:not(:defined) { display: none; }</style>
<mx-connected-button-group>
  <mx-button>A</mx-button>
  <mx-button>B</mx-button>
  <mx-button>C</mx-button>
</mx-connected-button-group>`;
    await nextFrame();
    await import('../../src/button/button.ts');
    await nextFrame();
    const ends = [...document.querySelectorAll('mx-button')].map((member) => [
      member.hasAttribute('data-first'),
      member.hasAttribute('data-last'),
    ]);

    expect([undefinedBefore, ends]).toEqual([
      true,
      [
        [true, false],
        [false, false],
        [false, true],
      ],
    ]);
  });
});
