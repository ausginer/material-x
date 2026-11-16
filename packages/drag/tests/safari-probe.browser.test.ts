/** Temporary probe for Safari's CI run; removed after the reading. */
import { describe, it } from 'vitest';
import { commands, server } from 'vitest/browser';
import { frames } from './support/harness.ts';

declare module 'vitest/browser' {
  interface BrowserCommands {
    probeChain(
      variant: string,
      points: ReadonlyArray<readonly [number, number]>,
    ): Promise<void>;
  }
}

describe.runIf(server.browser === 'safari')('safari probe', () => {
  it('reads the environment', async () => {
    const box = document.createElement('div');

    document.body.append(box);
    const animation = box.animate([{ opacity: 0 }, { opacity: 1 }], 1000);

    await frames(3);
    console.warn(
      `PROBE env ${JSON.stringify({
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        visibility: document.visibilityState,
        focus: document.hasFocus(),
        animationTime: animation.currentTime,
        animationState: animation.playState,
        inner: [innerWidth, innerHeight],
      })}`,
    );
    animation.cancel();
    box.remove();
  });

  for (const variant of ['plain', 'pause', 'duration']) {
    it(`reads the moves of a ${variant} chain`, async () => {
      const seen: string[] = [];
      const log = (event: PointerEvent): void => {
        seen.push(
          `${event.clientX},${event.clientY}/${event.getCoalescedEvents().length}`,
        );
      };

      await commands.pointerMove(100, 100);
      await commands.pointerDown();
      document.addEventListener('pointermove', log);
      await commands.probeChain(variant, [
        [150, 150],
        [200, 200],
        [250, 250],
        [300, 300],
      ]);
      const readings = [`returned: ${seen.join(' ')}`];

      await frames(1);
      readings.push(`1 frame: ${seen.join(' ')}`);
      await frames(2);
      readings.push(`3 frames: ${seen.join(' ')}`);
      await new Promise((resolve) => {
        setTimeout(resolve, 200);
      });
      readings.push(`200 ms: ${seen.join(' ')}`);
      document.removeEventListener('pointermove', log);
      await commands.pointerUp();
      console.warn(`PROBE ${variant} | ${readings.join(' | ')}`);
    });
  }

  it('reads the moves of the pointerMove command with steps', async () => {
    const seen: string[] = [];
    const log = (event: PointerEvent): void => {
      seen.push(`${event.clientX},${event.clientY}`);
    };

    await commands.pointerMove(100, 100);
    await commands.pointerDown();
    document.addEventListener('pointermove', log);
    await commands.pointerMove(200, 200, 2);
    await commands.pointerMove(300, 300, 2);
    const returned = seen.join(' ');

    await frames(2);
    const framed = seen.join(' ');

    document.removeEventListener('pointermove', log);
    await commands.pointerUp();
    console.warn(`PROBE command | returned: ${returned} | 2 frames: ${framed}`);
  });
});
