/**
 * Copied into `packages/material-x/tests/radio/` for one run and removed after
 * it. It mounts the selection state fixture as the visual row does and records
 * the animations in each radio's shadow root at each step of the row's settle
 * sequence, into `radio-animations.json` at the package root.
 */
import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/radio/radio.ts';
import { nextFrame, whenFontsReady } from '../browser.ts';

type Step = Readonly<{ step: string; animations: readonly string[] }>;

function read(fixture: HTMLElement): readonly string[] {
  return [...fixture.children].flatMap((child, index) =>
    (child.shadowRoot?.getAnimations() ?? []).map((animation) => {
      const name =
        animation instanceof CSSTransition
          ? `transition ${animation.transitionProperty}`
          : animation instanceof CSSAnimation
            ? `animation ${animation.animationName}`
            : 'other';

      return `radio ${index}: ${name}, ${animation.playState}, t=${String(animation.currentTime)}`;
    }),
  );
}

it('should record the radio animations through the settle sequence', async () => {
  const steps: Step[] = [];
  const fixture = document.createElement('div');

  fixture.className = 'mx-test-fixture';
  document.body.append(fixture);
  fixture.append(document.createElement('mx-radio'));

  const checked = document.createElement('mx-radio');

  checked.setAttribute('checked', '');
  fixture.append(checked);
  steps.push({ step: 'after append', animations: read(fixture) });
  await whenFontsReady();
  steps.push({ step: 'after whenFontsReady', animations: read(fixture) });
  await nextFrame();
  steps.push({ step: 'after one frame', animations: read(fixture) });
  await nextFrame();
  steps.push({ step: 'after two frames', animations: read(fixture) });
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });
  steps.push({ step: 'after 500 ms', animations: read(fixture) });
  await commands.writeFile(
    'radio-animations.json',
    JSON.stringify(steps, null, 2),
  );
  expect(steps).toHaveLength(5);
});
